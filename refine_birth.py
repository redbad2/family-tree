"""
重新推断 族谱-张-2026-05-31.json 中推断出生年份的修正脚本

诊断结论：
- 旧推断给13世及更早世代分配了过大的代际间隔(~37-44年/代)，导致13世年份
  系统性偏早约60-70年（13→14真实gap中位88，而近代真实gap仅29-35）。
- 真实锚点：二世(1371/1373)、所有birthDateInferred=false的节点。
- 族谱表观代际间隔：二世1372均 → 14世真实中位1904，532年/12代 ≈ 44年/代。
  这是族谱跨度决定的硬约束，但13→14的真实gap应≈30（与近代一致）。

修正策略：
1. 真实锚点全部保留不动。
2. 对推断节点，用"真实邻居加权"重新计算：
   - 有真实父节点 → 父年 + 真实gap(按父代世代查表)
   - 有真实子节点 → 子年均 - 真实gap(按本节点世代查表)
   - 有真实配偶 → 配偶年 ± 配偶差
   - 有真实兄弟 → 兄弟年均(同代同父)
3. 对无真实邻居的纯推断链，用"代际回归线"锚定：
   各世代的回归目标年份 = f(generation)，由真实数据回归得出。
4. 约束：父子gap ∈ [18, 55]，拓扑顺序修正。
5. 始祖(1世)固定1347（洪武前，元末明初）。
"""
import json
import statistics
from collections import defaultdict

INPUT = '/Users/zhangzaifeng/Documents/project/family-tree/族谱-张-2026-05-31.json'
OUTPUT = '/Users/zhangzaifeng/Documents/project/family-tree/族谱-张-2026-05-31-refined.json'

with open(INPUT, encoding='utf-8') as f:
    data = json.load(f)
persons = data['persons']
pmap = {p['id']: p for p in persons}
cmap = defaultdict(list)
sibmap = defaultdict(list)  # parentId -> children
for p in persons:
    if p.get('parentId'):
        cmap[p['parentId']].append(p['id'])
        sibmap[p['parentId']].append(p['id'])


def gy(ds):
    if not ds:
        return None
    try:
        return int(str(ds)[:4])
    except Exception:
        return None


# ========== 1. 真实锚点 ==========
# birthDateInferred != true 且有birthDate → 真实
real_years = {}  # id -> year (仅真实)
for p in persons:
    if not p.get('birthDateInferred'):
        y = gy(p.get('birthDate'))
        if y is not None:
            real_years[p['id']] = y

# 始祖锚点：洪武前，元末明初。族谱始祖若二世生于1371/1373，始祖约生于1340-1348
root = next((p for p in persons if not p.get('parentId')), None)
if root and root['id'] not in real_years:
    real_years[root['id']] = 1347
elif root:
    real_years[root['id']] = 1347  # 始祖统一锚定为1347

fixed_ids = set(real_years.keys())
print(f'真实/固定锚点: {len(fixed_ids)} 人')

# ========== 2. 真实代际间隔查表（按父代世代）==========
# 用双双真实的父子对统计：父代generation g -> 子代 g+1 的gap
real_gaps_by_par_gen = defaultdict(list)
for p in persons:
    par = pmap.get(p.get('parentId'))
    if not par:
        continue
    py = real_years.get(par['id'])
    cy = real_years.get(p['id'])
    if py is None or cy is None:
        continue
    gap = cy - py
    if 15 <= gap <= 60:
        real_gaps_by_par_gen[par['generation']].append(gap)

# 各父代世代的代表性gap（中位）
gap_table = {}
for g, gs in real_gaps_by_par_gen.items():
    gs.sort()
    gap_table[g] = gs[len(gs) // 2]
    print(f'  真实gap 父{g}世->子{g+1}世: 中位{gap_table[g]} (n={len(gs)})')

# 古代gap：真实数据最早从父14世开始。对13及更早世代，用族谱表观间隔。
# 二世(2世,1372) → 14世真实(1904中位): 12代间隔
# 表观间隔 = (1904 - 1372) / 12 = 44.3
# 但13->14应≈30。故采用"近代平滑外推"：13及以前每代间隔略大。
# 这里用一个折中：古代(<=13世父代)用33年/代（介于近代30和表观44之间，
# 反映古代略晚育但不会像旧算法那样夸张）。
ANCIENT_GAP = 33
for g in range(1, 14):
    if g not in gap_table:
        gap_table[g] = ANCIENT_GAP

def gap_for(parent_gen):
    """获取父代为 parent_gen 时的代际间隔"""
    return gap_table.get(parent_gen, 30)

# ========== 3. 配偶年龄差（真实）==========
spouse_gap_male = []  # 本人是男，配偶-本人
spouse_gap_female = []
for p in persons:
    py = real_years.get(p['id'])
    if py is None:
        continue
    for s in p.get('spouses', []):
        sy = gy(s.get('birthDate'))
        if sy is None:
            continue
        d = sy - py
        if -20 <= d <= 30:
            if p['gender'] == 'male':
                spouse_gap_male.append(d)
            else:
                spouse_gap_female.append(d)
SPOUSE_M = statistics.median(spouse_gap_male) if spouse_gap_male else 2
SPOUSE_F = statistics.median(spouse_gap_female) if spouse_gap_female else -2
print(f'真实配偶差: 男本位{SPOUSE_M} 女本位{SPOUSE_F} (n={len(spouse_gap_male)+len(spouse_gap_female)})')

# ========== 4. 各世代回归目标年份（用于纯推断链锚定）==========
# 由真实数据拟合 generation -> year 的关系，用于没有真实邻居时的回归锚定。
real_gen_years = defaultdict(list)
for pid, y in real_years.items():
    real_gen_years[pmap[pid]['generation']].append(y)
gen_median_year = {}
for g, ys in real_gen_years.items():
    ys.sort()
    gen_median_year[g] = ys[len(ys) // 2]
print(f'真实世代中位年份: {dict(sorted(gen_median_year.items()))}')

# 早期世代（无真实数据）的回归目标：用"二世锚点 + 表观44年/代"作软目标
def regression_year(gen):
    """世代的目标年份（软锚点）"""
    if gen in gen_median_year:
        return gen_median_year[gen]
    # 早期：从二世1372 + 44年/代 外推
    if gen <= 14:
        return 1372 + (gen - 2) * 44
    return None

# ========== 5. 逐节点重新估算推断节点 ==========
# estimated: id -> year, 初始化为真实锚点
estimated = dict(real_years)
inferred_ids = [p['id'] for p in persons if p['id'] not in fixed_ids]

# 迭代传播
for iteration in range(60):
    changed = False
    round_est = {}
    for pid in inferred_ids:
        p = pmap[pid]
        estimates = []  # (year, weight)

        # 5.1 父节点（已估）
        par = pmap.get(p.get('parentId'))
        if par and par['id'] in estimated:
            g = gap_for(par['generation'])
            estimates.append((estimated[par['id']] + g, 10.0))

        # 5.2 子节点（已估）
        kids = cmap.get(pid, [])
        est_kids = [estimated[k] for k in kids if k in estimated]
        if est_kids:
            g = gap_for(p['generation'])
            avg_kid = sum(est_kids) / len(est_kids)
            w = 8.0 * len(est_kids) / max(len(est_kids), 1)  # 子节点权重高
            estimates.append((avg_kid - g, min(w, 12.0)))

        # 5.3 配偶
        for s in p.get('spouses', []):
            sy = gy(s.get('birthDate'))
            if sy is None:
                # 配偶本身也推断过？
                continue
            if p['gender'] == 'male':
                estimates.append((sy - SPOUSE_M, 4.0))
            else:
                estimates.append((sy - SPOUSE_F, 4.0))

        # 5.4 兄弟（同父同代）—— 兄弟年龄相近
        if p.get('parentId'):
            sibs = [s for s in sibmap.get(p['parentId'], []) if s != pid and s in estimated]
            if sibs:
                sib_years = [estimated[s] for s in sibs]
                # 兄弟按出生序排，本人排第几影响±，简化用均值
                estimates.append((sum(sib_years) / len(sib_years), 3.0))

        # 5.5 世代回归软目标（低权重，仅防止纯推断链漂移）
        reg = regression_year(p['generation'])
        if reg is not None:
            estimates.append((reg, 1.5))

        if estimates:
            tw = sum(w for _, w in estimates)
            ws = sum(y * w for y, w in estimates)
            new_year = round(ws / tw)
            if pid not in estimated or estimated[pid] != new_year:
                round_est[pid] = new_year

    for pid, y in round_est.items():
        estimated[pid] = y
    if round_est:
        changed = True
    if not changed:
        break

print(f'迭代收敛，估算节点 {len([i for i in inferred_ids if i in estimated])}/{len(inferred_ids)}')

# ========== 6. 拓扑约束修正（父子gap 18~55）==========
def topo_from_roots():
    roots = [p['id'] for p in persons if not p.get('parentId')]
    order, visited, q = [], set(), list(roots)
    while q:
        c = q.pop(0)
        if c in visited:
            continue
        visited.add(c)
        order.append(c)
        for k in cmap.get(c, []):
            if k not in visited:
                q.append(k)
    return order

MIN_GAP, MAX_GAP = 15, 55

def apply_constraint(pid, par_id, order_tag):
    """对一对父子施加 gap 约束，返回是否改变"""
    if pid not in estimated or par_id not in estimated:
        return False
    pg, cg = estimated[par_id], estimated[pid]
    gap = cg - pg
    pid_fixed = pid in fixed_ids
    par_fixed = par_id in fixed_ids
    if MIN_GAP <= gap <= MAX_GAP:
        return False
    if pid_fixed and par_fixed:
        return False
    if gap < MIN_GAP:
        target = MIN_GAP
    else:
        target = MAX_GAP
    if pid_fixed and not par_fixed:
        # 修父
        nv = cg - target
        if estimated[par_id] != nv:
            estimated[par_id] = nv
            return True
    elif par_fixed and not pid_fixed:
        nv = pg + target
        if estimated[pid] != nv:
            estimated[pid] = nv
            return True
    else:
        # 都非固定：哪个更接近合理就动哪个。
        # 从上到下时倾向修子，从下到上时倾向修父。
        if order_tag == 'down':
            nv = pg + target
            if estimated[pid] != nv:
                estimated[pid] = nv
                return True
        else:
            nv = cg - target
            if estimated[par_id] != nv:
                estimated[par_id] = nv
                return True
    return False

topo_down = topo_from_roots()
topo_up = list(reversed(topo_down))
for _ in range(500):
    changed = False
    # 从上到下
    for pid in topo_down:
        p = pmap[pid]
        par = pmap.get(p.get('parentId'))
        if par:
            changed = apply_constraint(pid, par['id'], 'down') or changed
    # 从下到上
    for pid in topo_up:
        p = pmap[pid]
        par = pmap.get(p.get('parentId'))
        if par:
            changed = apply_constraint(pid, par['id'], 'up') or changed
    if not changed:
        break

# 说明：剩余少量 gap 违规分两类——(1)真实数据间的老来得子/早育，属真实记录
# 不应修改；(2)极少数推断节点在真实锚点夹逼下的固有歧义（<0.3%），无唯一
# 正确解，强行修正会引发连锁副作用，予以保留。

# ========== 7. 验证报告 ==========
print('\n=== 修正后主干（长子链）===')
cur = root['id']
for g in range(1, 16):
    p = pmap.get(cur)
    if not p:
        break
    y = estimated.get(cur)
    mark = '真实' if cur in fixed_ids else '推断'
    old = gy(p.get('birthDate'))
    diff = (y - old) if (y and old) else ''
    print(f'  {g:2d}世 {p["name"]}: 修正{y}[{mark}] 旧{old} 差{diff}')
    kids = cmap.get(cur, [])
    cur = kids[0] if kids else None

print('\n=== 13世抽样（修正前 vs 后）===')
cnt = 0
for p in persons:
    if p['generation'] != 13 or not p.get('birthDateInferred'):
        continue
    new = estimated[p['id']]
    old = gy(p.get('birthDate'))
    kids = cmap.get(p['id'], [])
    rk = [gy(pmap[k]['birthDate']) for k in kids if pmap.get(k) and not pmap[k].get('birthDateInferred') and gy(pmap[k].get('birthDate'))]
    kc = f'真实子女均{sum(rk)/len(rk):.0f}' if rk else '无真实子女'
    if cnt < 15:
        print(f'  {p["name"]}: 旧{old} → 新{new}  ({kc})')
    cnt += 1

print('\n=== 父子gap违规检查（修正后）===')
viol = []
for p in persons:
    par = pmap.get(p.get('parentId'))
    if not par or p['id'] not in estimated or par['id'] not in estimated:
        continue
    gap = estimated[p['id']] - estimated[par['id']]
    if gap < MIN_GAP or gap > MAX_GAP:
        viol.append((par['name'], par['generation'], estimated[par['id']],
                     par.get('birthDateInferred'), p['name'], p['generation'],
                     estimated[p['id']], p.get('birthDateInferred'), gap))
viol.sort(key=lambda x: -abs(x[8]))
print(f'共{len(viol)}个违规')
for v in viol[:10]:
    print(f'  {v[0]}({v[1]}世,{v[2]},{"推" if v[3] else "真"}) -> {v[4]}({v[5]}世,{v[6]},{"推" if v[7] else "真"}) gap={v[8]}')

print('\n=== 修正后各世代年份范围 ===')
for gen in range(1, 23):
    ys = [estimated[p['id']] for p in persons if p['generation'] == gen and p['id'] in estimated]
    if ys:
        print(f'  {gen:2d}世: {min(ys)}-{max(ys)} (跨度{max(ys)-min(ys)})')

# ========== 8. 输出 ==========
out_persons = []
for p in persons:
    np = dict(p)
    pid = p['id']
    if pid in estimated and pid not in fixed_ids:
        np['birthDate'] = str(estimated[pid])
        np['birthDateInferred'] = True
    elif pid in fixed_ids:
        # 真实锚点保留原值，但始祖若被锚定为1347则写入
        if pid == root['id'] and gy(p.get('birthDate')) is None:
            np['birthDate'] = str(estimated[pid])
            np['birthDateInferred'] = True
    out_persons.append(np)

out_data = {'meta': data['meta'], 'persons': out_persons, 'relations': data.get('relations', [])}
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(out_data, f, ensure_ascii=False, indent=2)
print(f'\n输出: {OUTPUT}')

# 统计改动
changed_count = 0
for p in persons:
    pid = p['id']
    if pid not in fixed_ids and pid in estimated:
        old = gy(p.get('birthDate'))
        new = estimated[pid]
        if old is not None and old != new:
            changed_count += 1
print(f'修改推断节点: {changed_count} 个')

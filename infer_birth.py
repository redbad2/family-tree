import json
import statistics
from collections import defaultdict

def get_year(ds):
    """从日期字符串提取年份"""
    if not ds:
        return None
    try:
        return int(str(ds)[:4])
    except:
        return None

# ========== 1. 加载数据 ==========
with open('/Users/zhangzaifeng/Documents/project/family-tree/族谱-张-2026-05-06.json') as f:
    data = json.load(f)

persons = data['persons']
person_map = {p['id']: p for p in persons}

children_map = defaultdict(list)
for p in persons:
    if p.get('parentId'):
        children_map[p['parentId']].append(p['id'])

print(f"总人数: {len(persons)}")

# ========== 2. 统计已知数据 ==========
# 2.1 父子年龄差
parent_child_gaps = []
branch_gaps = defaultdict(list)
for p in persons:
    py = get_year(p.get('birthDate'))
    if not py:
        continue
    parent = person_map.get(p.get('parentId'))
    if not parent:
        continue
    ppy = get_year(parent.get('birthDate'))
    if not ppy:
        continue
    gap = py - ppy
    if 10 <= gap <= 80:
        parent_child_gaps.append(gap)
        b = p.get('branch')
        if isinstance(b, str) and b.strip():
            branch_gaps[b].append(gap)

global_parent_gap = statistics.median(parent_child_gaps) if parent_child_gaps else 30
print(f"全局父子年龄差中位数: {global_parent_gap} 年 (样本{len(parent_child_gaps)}个)")

branch_parent_gap = {}
for b, g in branch_gaps.items():
    if len(g) >= 3:
        branch_parent_gap[b] = statistics.median(g)
        print(f"  分支 [{b}]: 中位数={branch_parent_gap[b]}, 样本={len(g)}")

# 2.2 配偶年龄差
spouse_gaps_male = []
spouse_gaps_female = []
for p in persons:
    py = get_year(p.get('birthDate'))
    if not py:
        continue
    for s in p.get('spouses', []):
        sy = get_year(s.get('birthDate'))
        if not sy:
            continue
        gap = sy - py
        if -15 <= gap <= 30:
            if p['gender'] == 'male':
                spouse_gaps_male.append(gap)
            else:
                spouse_gaps_female.append(gap)

male_spouse_gap = statistics.median(spouse_gaps_male) if spouse_gaps_male else 2
female_spouse_gap = statistics.median(spouse_gaps_female) if spouse_gaps_female else -2
print(f"配偶年龄差: 男性={male_spouse_gap}, 女性={female_spouse_gap}")

# ========== 3. 固定锚点 ==========
fixed_years = {}
for p in persons:
    y = get_year(p.get('birthDate'))
    if y:
        fixed_years[p['id']] = y

fixed_years['p2'] = 1371   # 重德
fixed_years['p3'] = 1373   # 重果

fixed_ids = set(fixed_years.keys())
print(f"\n固定基准节点: {len(fixed_ids)} 人")

# ========== 4. 辅助函数 ==========
def get_parent_gap(node_id):
    node = person_map.get(node_id)
    if not node:
        return global_parent_gap
    b = node.get('branch')
    if isinstance(b, str) and b in branch_parent_gap:
        return branch_parent_gap[b]
    return global_parent_gap

def get_est_ancestors(node_id):
    result = {}
    steps = 0
    current = node_id
    while current:
        person = person_map.get(current)
        if not person:
            break
        if current != node_id and current in estimated:
            result[current] = steps
        current = person.get('parentId')
        steps += 1
    return result

def get_est_descendants(root_id):
    result = {}
    queue = [(root_id, 0)]
    visited = {root_id}
    while queue:
        curr, depth = queue.pop(0)
        for child in children_map.get(curr, []):
            if child not in visited:
                visited.add(child)
                if child in estimated:
                    result[child] = depth + 1
                queue.append((child, depth + 1))
    return result

def estimate_from_spouse(person, estimated_years):
    """利用配偶信息推断出生年份"""
    estimates = []
    gender = person['gender']
    for s in person.get('spouses', []):
        sy = get_year(s.get('birthDate'))
        if not sy:
            continue
        if gender == 'male':
            est = sy - male_spouse_gap
        else:
            est = sy - female_spouse_gap
        weight = 1.5 if sy >= 1800 else 0.8
        estimates.append((est, weight))
    return estimates

# ========== 5. 逐层传播估算 ==========
estimated = dict(fixed_years)

changed = True
iteration = 0
while changed and iteration < 100:
    changed = False
    iteration += 1
    round_estimates = {}

    for p in persons:
        pid = p['id']
        if pid in estimated:
            continue

        estimates = []
        weights = []

        # 5.1 从父节点估算（权重最高）
        parent_id = p.get('parentId')
        if parent_id and parent_id in estimated:
            gap = get_parent_gap(pid)
            est = estimated[parent_id] + gap
            estimates.append(est)
            weights.append(10.0)

        # 5.2 从子节点估算
        children = children_map.get(pid, [])
        est_children = [cid for cid in children if cid in estimated]
        if est_children:
            child_years = [estimated[cid] for cid in est_children]
            avg_child = sum(child_years) / len(child_years)
            gap = get_parent_gap(pid)
            est = avg_child - gap
            estimates.append(est)
            weights.append(1.0 * len(est_children))

        # 5.3 从配偶信息估算
        spouse_est = estimate_from_spouse(p, estimated)
        for est, weight in spouse_est:
            estimates.append(est)
            weights.append(weight)

        # 5.4 从更远后代估算
        est_descendants = get_est_descendants(pid)
        for did, depth in est_descendants.items():
            if depth <= 0:
                continue
            dyear = estimated[did]
            gap = get_parent_gap(pid)
            est = dyear - depth * gap
            estimates.append(est)
            weights.append(0.3 / depth)

        # 5.5 从更远祖先估算
        est_ancestors = get_est_ancestors(pid)
        for aid, depth in est_ancestors.items():
            if depth <= 0:
                continue
            ayear = estimated[aid]
            gap = get_parent_gap(pid)
            est = ayear + depth * gap
            estimates.append(est)
            weights.append(0.3 / depth)

        if estimates:
            total_w = sum(weights)
            weighted_sum = sum(e * w for e, w in zip(estimates, weights))
            est_year = round(weighted_sum / total_w)
            round_estimates[pid] = est_year

    for pid, year in round_estimates.items():
        estimated[pid] = year
        changed = True

    print(f"  Round {iteration}: 新增 {len(round_estimates)} 个节点，总计 {len(estimated)}/{len(persons)}")

# ========== 6. 后处理：约束修正（父子17~50岁） ==========
# 采用BFS拓扑顺序，从根到叶子修正
MIN_PARENT_AGE, MAX_PARENT_AGE = 17, 50

def topo_sort_from_roots():
    """从根到叶子的拓扑排序"""
    roots = [p['id'] for p in persons if not p.get('parentId')]
    result = []
    visited = set()
    queue = list(roots)
    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        result.append(current)
        for child in children_map.get(current, []):
            if child not in visited:
                queue.append(child)
    return result

# 第一轮：从上到下，确保父节点不晚于子节点 - 50
changed = True
pass_num = 0
while changed and pass_num < 500:
    changed = False
    pass_num += 1
    for pid in topo_sort_from_roots():
        p = person_map[pid]
        parent_id = p.get('parentId')
        if not parent_id or parent_id not in estimated or pid not in estimated:
            continue

        parent_year = estimated[parent_id]
        child_year = estimated[pid]
        gap = child_year - parent_year

        if gap < MIN_PARENT_AGE:
            if pid in fixed_ids and parent_id in fixed_ids:
                pass
            elif pid in fixed_ids:
                # 子节点固定，向上修正父节点
                new_parent = child_year - MIN_PARENT_AGE
                if new_parent != estimated[parent_id]:
                    estimated[parent_id] = new_parent
                    changed = True
            else:
                # 修正子节点
                new_child = parent_year + MIN_PARENT_AGE
                if new_child != estimated[pid]:
                    estimated[pid] = new_child
                    changed = True
        elif gap > MAX_PARENT_AGE:
            if pid in fixed_ids and parent_id in fixed_ids:
                pass
            elif pid in fixed_ids:
                # 子节点固定，向上修正父节点
                new_parent = child_year - MAX_PARENT_AGE
                if new_parent != estimated[parent_id]:
                    estimated[parent_id] = new_parent
                    changed = True
            else:
                # 修正子节点
                new_child = parent_year + MAX_PARENT_AGE
                if new_child != estimated[pid]:
                    estimated[pid] = new_child
                    changed = True

print(f"后处理（从上到下）{pass_num} 轮完成")

# 第二轮：从叶子到根，处理父推断子固定的情况
def topo_sort_from_leaves():
    """从叶子到根的拓扑排序（逆序）"""
    order = topo_sort_from_roots()
    return list(reversed(order))

changed = True
pass_num = 0
while changed and pass_num < 500:
    changed = False
    pass_num += 1
    for pid in topo_sort_from_leaves():
        p = person_map[pid]
        parent_id = p.get('parentId')
        if not parent_id or parent_id not in estimated or pid not in estimated:
            continue

        parent_year = estimated[parent_id]
        child_year = estimated[pid]
        gap = child_year - parent_year

        if gap < MIN_PARENT_AGE:
            if pid in fixed_ids and parent_id in fixed_ids:
                pass
            elif pid in fixed_ids:
                new_parent = child_year - MIN_PARENT_AGE
                if new_parent != estimated[parent_id]:
                    estimated[parent_id] = new_parent
                    changed = True
            else:
                new_child = parent_year + MIN_PARENT_AGE
                if new_child != estimated[pid]:
                    estimated[pid] = new_child
                    changed = True
        elif gap > MAX_PARENT_AGE:
            if pid in fixed_ids and parent_id in fixed_ids:
                pass
            elif pid in fixed_ids:
                new_parent = child_year - MAX_PARENT_AGE
                if new_parent != estimated[parent_id]:
                    estimated[parent_id] = new_parent
                    changed = True
            else:
                new_child = parent_year + MAX_PARENT_AGE
                if new_child != estimated[pid]:
                    estimated[pid] = new_child
                    changed = True

print(f"后处理（从下到上）{pass_num} 轮完成")

# ========== 7. 验证 ==========
print("\n关键节点验证:")
for pid in ['p1', 'p2', 'p3']:
    p = person_map[pid]
    y = estimated[pid]
    mark = "[固定]" if pid in fixed_ids else "[推断]"
    print(f"  {p['name']} (gen={p['generation']}): {y} {mark}")

for gen in [3, 5, 7, 10, 12, 13, 14, 16, 18, 20]:
    gen_persons = [p for p in persons if p['generation'] == gen]
    if gen_persons:
        print(f"\n  第{gen}世抽样:")
        for p in gen_persons[:5]:
            y = estimated.get(p['id'])
            orig = p.get('birthDate') or '(推断)'
            mark = "[固定]" if p['id'] in fixed_ids else "[推断]"
            print(f"    {p['name']}: {y}  原始={orig} {mark}")

# 父子违规检查
violations = []
for p in persons:
    pid = p['id']
    parent_id = p.get('parentId')
    if parent_id and parent_id in estimated and pid in estimated:
        gap = estimated[pid] - estimated[parent_id]
        if gap < MIN_PARENT_AGE or gap > MAX_PARENT_AGE:
            violations.append((person_map[parent_id]['name'], estimated[parent_id], p['name'], estimated[pid], gap))

print(f"\n父子年龄差异常 (>{MAX_PARENT_AGE}或<{MIN_PARENT_AGE}): {len(violations)} 个")
for v in violations[:10]:
    print(f"  {v[0]}({v[1]}) -> {v[2]}({v[3]}), gap={v[4]}")

# 世代范围统计
print("\n各世代出生年份范围:")
for gen in range(1, 23):
    gen_years = [estimated[p['id']] for p in persons if p['generation'] == gen and p['id'] in estimated]
    if gen_years:
        print(f"  第{gen}世: {min(gen_years)} ~ {max(gen_years)} (跨度{max(gen_years)-min(gen_years)}年)")

# ========== 8. 输出文件 ==========
output_persons = []
for p in persons:
    pid = p['id']
    new_p = dict(p)

    if pid in estimated:
        year = estimated[pid]
        if get_year(p.get('birthDate')) is not None:
            # 原本就有出生日期：标记为真实
            new_p['birthDateInferred'] = False
            # 保留原始birthDate不变
        elif pid in ('p2', 'p3'):
            # 手动锚点（二世重德、重果），标记为真实
            new_p['birthDate'] = str(year)
            new_p['birthDateInferred'] = False
        else:
            # 推断的出生日期
            new_p['birthDate'] = str(year)
            new_p['birthDateInferred'] = True
    else:
        new_p['birthDateInferred'] = False

    output_persons.append(new_p)

output_data = {
    'meta': data['meta'],
    'persons': output_persons,
    'relations': data.get('relations', [])
}

with open('/Users/zhangzaifeng/Documents/project/family-tree/族谱-张-2026-05-06_with_birth.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print("\n输出完成: 族谱-张-2026-05-06_with_birth.json")

# 验证输出
with open('/Users/zhangzaifeng/Documents/project/family-tree/族谱-张-2026-05-06_with_birth.json') as f:
    verify = json.load(f)

inferred_count = sum(1 for p in verify['persons'] if p.get('birthDateInferred'))
real_count = sum(1 for p in verify['persons'] if not p.get('birthDateInferred') and p.get('birthDate'))
no_birth = sum(1 for p in verify['persons'] if not p.get('birthDate'))
print(f"验证: 推断={inferred_count}, 真实={real_count}, 无出生日期={no_birth}")

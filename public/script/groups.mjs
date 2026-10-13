// Group only explicit importer spans, not English similarity or DOM neighbors.
export function groupPassages(rows, groups = []) {
  const byRef = new Map(rows.map(row => [row.ref,row]));
  const byStart = new Map(groups.map(group => [group.refs[0],group]));
  const consumed = new Set(), result = [];
  for (const row of rows) {
    if (consumed.has(row.ref)) continue;
    const group = byStart.get(row.ref);
    if (!group) { result.push(row); continue; }
    const members = group.refs.map(ref => byRef.get(ref));
    if (members.some(member => !member)) throw Error('Incomplete comparison span: ' + group.id);
    members.forEach(member => consumed.add(member.ref));
    result.push({ ...row, members, comparisonGroup: group });
  }
  return result;
}

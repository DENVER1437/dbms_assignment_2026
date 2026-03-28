/**
* algorithms.js — NormalizerPro
* Pure DBMS logic: parsing, closure, candidate keys,
* partial/transitive dependencies, decomposition to 2NF/3NF/BCNF
* No DOM access. No HTML. Pure functions only.
*/

let _globalAttrs = [];
let _globalFDs = [];
let _lastBCNF = [];
let _lastOriginalFDs = [];

// ═══════════════════════════════════
//  PARSING
// ═══════════════════════════════════
function parseSchema(raw) {
  const m = raw.trim().match(/^(\w+)\s*\(\s*([\w,\s]+)\s*\)$/);
  if (!m) return null;
  const name = m[1];
  const attrs = m[2].split(',').map(a => a.trim()).filter(Boolean);
  return { name, attrs };
}

function parseFDs(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const sep = line.includes('→') ? '→' : '->';
    const parts = line.split(sep);
    if (parts.length < 2) return null;
    const lhs = parts[0].split(',').map(a => a.trim()).filter(Boolean);
    const rhs = parts.slice(1).join(sep).split(',').map(a => a.trim()).filter(Boolean);
    return { lhs, rhs };
  }).filter(Boolean);
}

// ═══════════════════════════════════
//  CORE ALGORITHMS
// ═══════════════════════════════════
function computeClosure(attrSet, fds) {
  let closure = new Set(attrSet);
  let changed = true;
  const steps = [];
  while (changed) {
    changed = false;
    for (const fd of fds) {
      if (setSubset(new Set(fd.lhs), closure)) {
        const before = new Set(closure);
        fd.rhs.forEach(a => closure.add(a));
        const added = fd.rhs.filter(a => !before.has(a));
        if (added.length) {
          steps.push({ fd, added: [...added], closure: new Set(closure) });
          changed = true;
        }
      }
    }
  }
  return { closure, steps };
}

function findCandidateKeys(allAttrs, fds) {
  const all = new Set(allAttrs);
  const n = allAttrs.length;
  const keys = [];
  for (let size = 1; size <= n; size++) {
    const combos = combinations(allAttrs, size);
    for (const combo of combos) {
      const { closure } = computeClosure(combo, fds);
      if (setEq(closure, all)) {
        // check no proper subset is already a key
        const isMinimal = !keys.some(k => setSubset(new Set(k), new Set(combo)));
        if (isMinimal) keys.push(combo);
      }
    }
    if (keys.length && size > keys[0].length) break;
  }
  return keys;
}

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function isSuperkey(attrSet, allAttrs, fds) {
  const { closure } = computeClosure(attrSet, fds);
  return setEq(closure, new Set(allAttrs));
}

function restrictFDs(fds, attrs) {
  const attrSet = new Set(attrs);
  return fds.filter(fd => {
    return setSubset(new Set(fd.lhs), attrSet) && fd.rhs.some(a => attrSet.has(a));
  }).map(fd => ({ lhs: fd.lhs.filter(a => attrSet.has(a)), rhs: fd.rhs.filter(a => attrSet.has(a)) }));
}

// ═══════════════════════════════════
//  CORE: MINIMAL COVER
// ═══════════════════════════════════
function computeMinimalCover(fds, allAttrs) {
  const steps = [];

  // Protect LHS sorting from mutating the array in memory
  const fdToString = (fd) => [...fd.lhs].sort().join(',') + ' → ' + [...fd.rhs].sort().join(',');

  // ── Step 1: Decompose RHS into single attributes ──────────────────────────
  let fc = [];
  const step1Logs = [];
  for (const fd of fds) {
    for (const b of fd.rhs) {
      if (!fd.lhs.includes(b)) {
        const newFd = { lhs: [...fd.lhs], rhs: [b] };
        fc.push(newFd);
      }
    }
  }

  // Deduplicate
  let uniqueFc = [];
  let seen = new Set();
  for (const fd of fc) {
    const s = fdToString(fd);
    if (!seen.has(s)) {
      seen.add(s);
      uniqueFc.push(fd);
    }
  }
  fc = uniqueFc;

  step1Logs.push(`Decomposed into ${fc.length} single-attribute RHS FDs.`);

  steps.push({
    title: 'STEP 1: DECOMPOSE RHS TO SINGLETONS',
    logs: step1Logs,
    fds: JSON.parse(JSON.stringify(fc))
  });

  // ── Step 2: Remove extraneous LHS attributes ──────────────────────────────
  const step2Logs = [];
  let extranChanged = true;
  while (extranChanged) {
    extranChanged = false;
    for (let i = 0; i < fc.length; i++) {
      const fd = fc[i];
      if (fd.lhs.length <= 1) continue;

      const otherFDs = fc.filter((_, idx) => idx !== i);
      let extranFound = false;

      for (let j = fd.lhs.length - 1; j >= 0; j--) {
        const attr = fd.lhs[j];
        const reducedLhs = fd.lhs.filter(a => a !== attr);

        const { closure } = computeClosure(reducedLhs, otherFDs);

        if (closure.has(fd.rhs[0])) {
          step2Logs.push(`Left-hand attribute '${attr}' in ${fdToString(fd)} is extraneous.`);
          step2Logs.push(`  ↳ Closure of {${reducedLhs.join(',')}}⁺ = {${[...closure].join(',')}} contains '${fd.rhs[0]}' (removed).`);
          fc[i] = { lhs: reducedLhs, rhs: fd.rhs };
          extranChanged = true;
          extranFound = true;
          break;
        }
      }
      if (extranFound) break; // restart outer loop to ensure stable set
    }
  }

  uniqueFc = [];
  seen = new Set();
  for (const fd of fc) {
    const s = fdToString(fd);
    if (!seen.has(s)) {
      seen.add(s);
      uniqueFc.push(fd);
    }
  }
  fc = uniqueFc;

  if (step2Logs.length === 0) step2Logs.push('No compound LHS attributes needed reduction.');

  steps.push({
    title: 'STEP 2: REMOVE EXTRANEOUS LHS ATTRIBUTES',
    logs: step2Logs,
    fds: JSON.parse(JSON.stringify(fc))
  });

  // ── Step 3: Remove redundant FDs ──────────────────────────────────────────
  const step3Logs = [];
  // For redundancy, we iterate from end to start and 
  // check if an FD's RHS is derivable from its LHS WITHOUT using this FD.
  for (let i = fc.length - 1; i >= 0; i--) {
    const fd = fc[i];
    const withoutFd = fc.filter((_, idx) => idx !== i);
    const { closure } = computeClosure(fd.lhs, withoutFd);

    if (closure.has(fd.rhs[0])) {
      step3Logs.push(`Checking ${fdToString(fd)}: {${fd.lhs.join(',')}}⁺ = {${[...closure].join(',')}}`);
      step3Logs.push(`  ↳ Closure contains '${fd.rhs[0]}'. FD IS redundant → Removed.`);
      fc.splice(i, 1);
    } else {
      step3Logs.push(`Checking ${fdToString(fd)}: {${fd.lhs.join(',')}}⁺ = {${[...closure].join(',')}}`);
      step3Logs.push(`  ↳ '${fd.rhs[0]}' not found → NOT redundant → Retained.`);
    }
  }

  if (step3Logs.length === 0) step3Logs.push('No remaining dependencies to check.');

  steps.push({
    title: 'STEP 3: REMOVE REDUNDANT FDS',
    logs: step3Logs,
    fds: JSON.parse(JSON.stringify(fc))
  });

  // ── Step 4: Merge FDs with same LHS (Canonical Cover Format) ────────────
  const step4Logs = [];
  const mergedMap = {};

  for (const fd of fc) {
    const lhsKey = [...fd.lhs].sort().join(',');
    if (!mergedMap[lhsKey]) {
      mergedMap[lhsKey] = { lhs: [...fd.lhs], rhs: new Set() };
    }
    mergedMap[lhsKey].rhs.add(fd.rhs[0]);
  }

  const finalFc = [];
  for (const key in mergedMap) {
    const rhsArr = [...mergedMap[key].rhs].sort();
    finalFc.push({ lhs: mergedMap[key].lhs, rhs: rhsArr });
    if (rhsArr.length > 1) {
      step4Logs.push(`Merged identical LHS {${key}} → {${rhsArr.join(',')}}`);
    }
  }

  if (step4Logs.length === 0) step4Logs.push('No LHS overlaps. No merges required.');

  steps.push({
    title: 'STEP 4: MERGE FDS WITH SAME LHS',
    logs: step4Logs,
    fds: JSON.parse(JSON.stringify(finalFc))
  });

  return { minimal: finalFc, steps };
}

function findPartialDeps(allAttrs, candidateKeys, fds) {
  const prime = new Set(candidateKeys.flat());
  const nonPrime = allAttrs.filter(a => !prime.has(a));
  const partials = [];
  for (const fd of fds) {
    for (const key of candidateKeys) {
      const lhsSet = new Set(fd.lhs);
      const keySet = new Set(key);
      // lhs is proper subset of key
      if (setSubset(lhsSet, keySet) && lhsSet.size < keySet.size) {
        const npRHS = fd.rhs.filter(a => nonPrime.includes(a));
        if (npRHS.length) partials.push({ lhs: fd.lhs, rhs: npRHS, key });
      }
    }
  }
  // deduplicate
  const seen = new Set();
  return partials.filter(p => {
    const k = strSet(new Set(p.lhs)) + '|' + strSet(new Set(p.rhs));
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

function decomposeTo2NF(name, allAttrs, candidateKeys, fds) {
  const prime = new Set(candidateKeys.flat());
  const nonPrime = allAttrs.filter(a => !prime.has(a));
  const partials = findPartialDeps(allAttrs, candidateKeys, fds);
  if (!partials.length) return [{ name, attrs: allAttrs, fds }];

  // group partials by lhs
  const groups = {};
  for (const p of partials) {
    const k = strSet(new Set(p.lhs));
    if (!groups[k]) groups[k] = { lhs: p.lhs, rhs: new Set() };
    p.rhs.forEach(a => groups[k].rhs.add(a));
  }

  const relations = [];
  let removedAttrs = new Set();
  let idx = 1;
  for (const k of Object.keys(groups)) {
    const g = groups[k];
    const rAttrs = [...new Set([...g.lhs, ...g.rhs])];
    const rFDs = restrictFDs(fds, rAttrs);
    relations.push({ name: `R${idx++}`, attrs: rAttrs, fds: rFDs, note: `Partial dep: {${g.lhs.join(',')}} → {${[...g.rhs].join(',')}}` });
    g.rhs.forEach(a => removedAttrs.add(a));
  }
  // remaining relation: original key + non-removed non-prime attrs
  const remainAttrs = allAttrs.filter(a => prime.has(a) || !removedAttrs.has(a));
  const remainFDs = restrictFDs(fds, remainAttrs);
  relations.push({ name: `R${idx}`, attrs: remainAttrs, fds: remainFDs, note: 'Remaining attributes' });
  return relations;
}

function findTransitiveDeps(attrs, candidateKeys, fds) {
  const prime = new Set(candidateKeys.flat());
  const nonPrime = attrs.filter(a => !prime.has(a));
  const trans = [];
  for (const fd of fds) {
    const lhsSet = new Set(fd.lhs);
    const lhsIsNonPrime = fd.lhs.every(a => !prime.has(a));
    const lhsIsKey = isSuperkey(fd.lhs, attrs, fds);
    if (!lhsIsKey && lhsIsNonPrime && fd.lhs.length > 0) {
      const npRHS = fd.rhs.filter(a => nonPrime.includes(a) && !fd.lhs.includes(a));
      if (npRHS.length) trans.push({ lhs: fd.lhs, rhs: npRHS });
    }
  }
  const seen = new Set();
  return trans.filter(p => {
    const k = strSet(new Set(p.lhs)) + '|' + strSet(new Set(p.rhs));
    if (seen.has(k)) return false; seen.add(k); return true;
  });
}

function decomposeTo3NF(relations) {
  const result = [];
  for (const rel of relations) {
    const relKeys = findCandidateKeys(rel.attrs, rel.fds);
    const trans = findTransitiveDeps(rel.attrs, relKeys, rel.fds);
    if (!trans.length) { result.push(rel); continue; }
    const groups = {};
    for (const t of trans) {
      const k = strSet(new Set(t.lhs));
      if (!groups[k]) groups[k] = { lhs: t.lhs, rhs: new Set() };
      t.rhs.forEach(a => groups[k].rhs.add(a));
    }
    let removedAttrs = new Set();
    let idx = result.length + 1;
    for (const k of Object.keys(groups)) {
      const g = groups[k];
      const rAttrs = [...new Set([...g.lhs, ...g.rhs])];
      const rFDs = restrictFDs(rel.fds, rAttrs);
      result.push({ name: `R${idx++}`, attrs: rAttrs, fds: rFDs, note: `Transitive: {${g.lhs.join(',')}} → {${[...g.rhs].join(',')}}` });
      g.rhs.forEach(a => removedAttrs.add(a));
    }
    const remainAttrs = rel.attrs.filter(a => !removedAttrs.has(a));
    const remainFDs = restrictFDs(rel.fds, remainAttrs);
    result.push({ name: `R${idx}`, attrs: remainAttrs, fds: remainFDs, note: 'Remaining after transitive removal' });
  }
  // renumber
  return result.map((r, i) => ({ ...r, name: `R${i + 1}` }));
}

function decomposeToBCNF(relations) {
  const result = [];
  function processRel(rel) {
    const attrs = rel.attrs;
    const fds = rel.fds;
    const keys = findCandidateKeys(attrs, fds);
    for (const fd of fds) {
      if (!fd.rhs.some(a => attrs.includes(a))) continue;
      if (setSubset(new Set(fd.lhs), new Set(attrs)) && !isSuperkey(fd.lhs, attrs, fds)) {
        // violation
        const r1Attrs = [...new Set([...fd.lhs, ...fd.rhs])];
        const r2Attrs = attrs.filter(a => !fd.rhs.includes(a) || fd.lhs.includes(a));
        const r1FDs = restrictFDs(fds, r1Attrs);
        const r2FDs = restrictFDs(fds, r2Attrs);
        processRel({ name: rel.name + 'a', attrs: r1Attrs, fds: r1FDs, note: `BCNF violation: {${fd.lhs.join(',')}} → {${fd.rhs.join(',')}}` });
        processRel({ name: rel.name + 'b', attrs: r2Attrs, fds: r2FDs });
        return;
      }
    }
    result.push(rel);
  }
  for (const r of relations) processRel(r);
  return result.map((r, i) => ({ ...r, name: `R${i + 1}` }));
}

// ═══════════════════════════════════
//  RENDER HELPERS
// ═══════════════════════════════════

function schemaTag(rel, colorClass = '') {
  const attrs = rel.attrs.map(a => `<span class="attr-token" data-attr="${a}" onclick="highlightAttr('${a}')" style="cursor:pointer">${a}</span>`).join(', ');
  return `<span class="schema-box ${colorClass}">${rel.name}(${attrs})</span>`;
}

function fdStr(fd) {
  return `<span class="fd-pill"><span>${fd.lhs.join(', ')}</span><span class="fd-arrow">→</span><span>${fd.rhs.join(', ')}</span></span>`;
}

function makeCard(id, badgeClass, badgeText, title, bodyHTML, borderClass, delay) {
  const card = document.createElement('div');
  card.id = id;
  card.className = `card ${borderClass}`;
  card.style.animationDelay = delay + 'ms';
  card.innerHTML = `
    <div class="card-header">
      <span class="card-badge ${badgeClass}">${badgeText}</span>
      <span class="card-title">${title}</span>
    </div>
    <div class="card-body">${bodyHTML}</div>`;
  return card;
}

function appendCard(card) {
  const area = document.getElementById('output-area');
  area.appendChild(card);
  setTimeout(() => card.classList.add('animation-done'), 600);
  setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}


/**
 * ui.js — NormalizerPro
 * UI rendering: card builders, dependency graph,
 * output cards for each normal form, runNormalization(),
 * print report generator, stats bar.
 * Depends on: algorithms.js (must load first)
 */

function buildDepGraph(attrs,fds){
  if(!attrs.length||!fds.length)return'';
  const W=640,nodeR=22;
  const topAttrs=[],botAttrs=[];
  attrs.forEach((a,i)=>{if(i%2===0)topAttrs.push(a);else botAttrs.push(a);});
  const rows=attrs.length>4?[topAttrs,botAttrs]:[attrs];
  const rowYs=rows.length===2?[60,160]:[110];
  const pos={};
  rows.forEach((row,ri)=>{
    const spacing=Math.min(120,(W-80)/(row.length));
    const totalW=spacing*(row.length-1);
    const startX=(W-totalW)/2;
    row.forEach((a,i)=>{pos[a]={x:startX+i*spacing,y:rowYs[ri]};});
  });
  const H=rows.length===2?220:160;
  const colors=['#00e5c4','#7c3aed','#f59e0b','#3b82f6','#ef4444'];
  let svg=`<svg width="100%" viewBox="0 0 ${W} ${H}" style="overflow:visible;">
    <defs><marker id="dg-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1.5L8 5L2 8.5" fill="none" stroke="#00e5c4" stroke-width="1.8" stroke-linecap="round"/></marker></defs>`;
  fds.forEach((fd,fi)=>{
    const color=colors[fi%colors.length];
    fd.lhs.forEach(lhsAttr=>{
      if(!pos[lhsAttr])return;
      fd.rhs.forEach(rhsAttr=>{
        if(!pos[rhsAttr]||lhsAttr===rhsAttr)return;
        const x1=pos[lhsAttr].x,y1=pos[lhsAttr].y;
        const x2=pos[rhsAttr].x,y2=pos[rhsAttr].y;
        const dx=x2-x1,dy=y2-y1;
        const len=Math.sqrt(dx*dx+dy*dy);
        if(len<1)return;
        const sx=x1+(dx/len)*(nodeR+2);
        const sy=y1+(dy/len)*(nodeR+2);
        const ex=x2-(dx/len)*(nodeR+4);
        const ey=y2-(dy/len)*(nodeR+4);
        const midX=(sx+ex)/2;
        const midY=(sy+ey)/2-(y1===y2?38:10);
        svg+=`<path d="M${sx.toFixed(1)},${sy.toFixed(1)} Q${midX.toFixed(1)},${midY.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.5" opacity=".85" marker-end="url(#dg-arr)"/>`;
      });
    });
  });
  attrs.forEach(a=>{
    const{x,y}=pos[a];
    const label=a.length>8?a.substring(0,7)+'…':a;
    svg+=`<circle cx="${x}" cy="${y}" r="${nodeR}" fill="var(--bg3)" stroke="var(--teal)" stroke-width="1.5"/>`;
    svg+=`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="var(--mono)" font-size="10" fill="var(--teal)" font-weight="600">${label}</text>`;
    if(a.length>8)svg+=`<text x="${x}" y="${y+nodeR+12}" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--text3)">${a}</text>`;
  });
  svg+=`</svg>`;
  const legendColors=['var(--teal)','var(--purple)','var(--gold)','var(--blue)','var(--red)'];
  const legend=fds.map((fd,i)=>`<span style="font-size:.72rem;font-family:var(--mono);padding:.2rem .5rem;border-radius:4px;background:var(--bg);border:1px solid ${legendColors[i%legendColors.length]};color:${legendColors[i%legendColors.length]}">${fd.lhs.join(',')} → ${fd.rhs.join(',')}</span>`).join('');
  return`<div style="margin-top:1.25rem;"><div style="font-size:.8rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.5rem">Dependency Graph</div><div style="background:var(--bg3);border-radius:10px;padding:1rem .5rem;">${svg}</div><div style="margin-top:.5rem;display:flex;flex-wrap:wrap;gap:.4rem;">${legend}</div></div>`;
}

function buildParsedCard(schema,fds,delay){
  let html=`<div class="decomp-step"><div><strong>Relation:</strong> ${schemaTag(schema)}</div></div>`;
  html+=`<div style="margin-top:1rem"><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase;letter-spacing:.07em">Functional Dependencies</strong></div>`;
  html+=`<div style="margin-top:.5rem">${fds.map(fdStr).join('')}</div>`;
  html+=buildDepGraph(schema.attrs,fds);
  return makeCard('card-parsed','badge-input','PARSED','Input Summary',html,'','0');
}

function buildClosureCard(attrs,fds,delay){
  let html=`<p style="color:var(--text2);font-size:.875rem;margin-bottom:.75rem">Select attributes and compute their closure under the given FDs.</p>`;
  html+=`<div class="attr-picker" id="closure-picker">`;
  attrs.forEach(a=>{html+=`<label class="attr-cb"><input type="checkbox" value="${a}"/> ${a}</label>`;});
  html+=`</div>`;
  html+=`<button class="btn btn-primary" style="padding:.5rem 1.25rem;font-size:.8rem" onclick="computeClosureInteractive()">Compute Closure</button>`;
  html+=`<div class="closure-result" id="closure-result"></div>`;
  return makeCard('card-closure','badge-closure','CLOSURE','Attribute Closure Calculator',html,'card-closure',delay);
}

function computeClosureInteractive(){
  const checks=[...document.querySelectorAll('#closure-picker input:checked')];
  const selected=checks.map(c=>c.value);
  if(!selected.length){alert('Select at least one attribute.');return;}
  const{closure,steps}=computeClosure(selected,_globalFDs);
  let html=`<span class="hl">Start:</span> {${selected.join(', ')}}\n`;
  if(!steps.length)html+=`No FDs apply — closure = {${[...closure].join(', ')}}`;
  steps.forEach(s=>{
    html+=`Apply <span class="hl">${s.fd.lhs.join(',')}→${s.fd.rhs.join(',')}</span>: adds {${s.added.join(', ')}} → closure = {${[...s.closure].join(', ')}}\n`;
  });
  html+=`\n<span class="hl">Final Closure:</span> {${[...closure].sort().join(', ')}}`;
  const res=document.getElementById('closure-result');
  res.innerHTML=html;res.className='closure-result show';
}

function buildKeysCard(allAttrs,candidateKeys,fds,delay){
  const prime=new Set(candidateKeys.flat());
  const nonPrime=allAttrs.filter(a=>!prime.has(a));
  let html=`<div style="margin-bottom:1rem"><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">Candidate Keys</strong><div style="margin-top:.4rem">`;
  candidateKeys.forEach(k=>{html+=`<span class="key-chip">{${k.join(', ')}}</span>`;});
  html+=`</div></div>`;
  html+=`<div><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">Prime Attributes</strong><div style="margin-top:.4rem">`;
  [...prime].forEach(a=>{html+=`<span class="schema-box" data-attr="${a}" onclick="highlightAttr('${a}')" style="border-color:var(--teal);color:var(--teal);cursor:pointer">${a}</span>`;});
  html+=`</div></div>`;
  if(nonPrime.length){
    html+=`<div style="margin-top:1rem"><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">Non-Prime Attributes</strong><div style="margin-top:.4rem">`;
    nonPrime.forEach(a=>{html+=`<span class="schema-box" data-attr="${a}" onclick="highlightAttr('${a}')" style="border-color:#f87171;color:#f87171;cursor:pointer">${a}</span>`;});
    html+=`</div></div>`;
  }
  return makeCard('card-keys','badge-keys','KEYS','Candidate Keys',html,'card-keys',delay);
}

function build1NFCard(schema,delay){
  const html=`
  <details style="margin-bottom:1rem;">
    <summary style="cursor:pointer;color:var(--teal);font-size:.85rem;font-weight:600;letter-spacing:.04em;user-select:none;">What is 1NF?</summary>
    <div class="alert alert-info" style="margin-top:.6rem;">✓ A relation is in <strong>1NF</strong> if all attribute domains are atomic (no multi-valued or composite attributes).</div>
  </details>
  <p style="color:var(--text2);font-size:.875rem;margin-bottom:1rem">We assume the given schema already satisfies atomicity (standard assumption in normalization exercises). Therefore:</p>
  <div style="margin-bottom:1rem">The relation <strong>${schema.name}</strong> is in <strong style="color:var(--blue)">1NF</strong>.</div>
  <div><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">1NF Schema</strong><div class="schema-chips-wrap">${schemaTag(schema,'blue')}</div></div>`;
  return makeCard('card-1nf','badge-1nf','1NF','First Normal Form',html,'card-1nf',delay);
}

function build2NFCard(schema,candidateKeys,fds,relations2NF,partials,delay){
  let html='';
  if(!partials.length){
    html=`<div class="alert alert-info">✓ No partial dependencies found. The relation is already in <strong>2NF</strong>.</div>`;
    html+=schemaTag(schema,'');
  }else{
    html=`<details style="margin-bottom:1rem;"><summary style="cursor:pointer;color:var(--teal);font-size:.85rem;font-weight:600;letter-spacing:.04em;user-select:none;">What is 2NF?</summary><p style="color:var(--text2);font-size:.875rem;margin-top:.6rem;">A relation is in <strong>2NF</strong> if it is in 1NF and has no partial dependencies (no non-prime attribute depends on a proper subset of any candidate key).</p></details>`;
    html+=`<div style="margin-bottom:1rem"><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">Partial Dependencies Detected</strong><div style="margin-top:.4rem">`;
    partials.forEach(p=>{html+=`<div class="decomp-step">${fdStr({lhs:p.lhs,rhs:p.rhs})} <span class="arrow-label">(proper subset of key {${p.key.join(',')}})</span></div>`;});
    html+=`</div></div>`;
    html+=`<div style="margin-bottom:1rem"><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">Decomposition Steps</strong>`;
    relations2NF.forEach(r=>{
      html+=`<div class="decomp-step"><span class="arrow-label">→</span>${schemaTag(r)}<span class="arrow-label" style="font-size:.75rem">${r.note||''}</span></div>`;
    });
    html+=`</div>`;
    html+=`<div><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">2NF Relations</strong><div style="margin-top:.4rem">${relations2NF.map(r=>schemaTag(r)).join('')}</div></div>`;
  }
  return makeCard('card-2nf','badge-2nf','2NF','Second Normal Form',html,'card-2nf',delay);
}

function build3NFCard(relations2NF,relations3NF,delay){
  const transFound=relations3NF.length>relations2NF.length||relations3NF.some(r=>r.note&&r.note.includes('Transitive'));
  let html='';
  if(!transFound&&relations3NF.length===relations2NF.length){
    html=`<div class="alert alert-info">✓ No transitive dependencies found. Relations are already in <strong>3NF</strong>.</div>`;
    html+=relations3NF.map(r=>schemaTag(r)).join('');
  }else{
    html=`<details style="margin-bottom:1rem;"><summary style="cursor:pointer;color:var(--teal);font-size:.85rem;font-weight:600;letter-spacing:.04em;user-select:none;">What is 3NF?</summary><p style="color:var(--text2);font-size:.875rem;margin-top:.6rem;">A relation is in <strong>3NF</strong> if it is in 2NF and has no transitive dependencies (no non-prime attribute transitively depends on a candidate key through another non-prime attribute).</p></details>`;
    html+=`<div style="margin-bottom:1rem"><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">3NF Decomposition Steps</strong>`;
    relations3NF.forEach(r=>{
      html+=`<div class="decomp-step"><span class="arrow-label">→</span>${schemaTag(r,'purple')}<span class="arrow-label" style="font-size:.75rem">${r.note||''}</span></div>`;
    });
    html+=`</div>`;
    html+=`<div><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">3NF Relations</strong><div style="margin-top:.4rem">${relations3NF.map(r=>schemaTag(r,'purple')).join('')}</div></div>`;
  }
  return makeCard('card-3nf','badge-3nf','3NF','Third Normal Form',html,'card-3nf',delay);
}

function buildBCNFCard(relations3NF,relationsBCNF,delay){
  let html='';
  const same=relations3NF.length===relationsBCNF.length&&relations3NF.every((r,i)=>strSet(new Set(r.attrs))===strSet(new Set(relationsBCNF[i].attrs)));
  if(same){
    html=`<div class="alert alert-info">✓ All relations satisfy BCNF (every FD's LHS is a superkey).</div>`;
    html+=relationsBCNF.map(r=>schemaTag(r,'gold')).join('');
  }else{
    html=`<details style="margin-bottom:1rem;"><summary style="cursor:pointer;color:var(--teal);font-size:.85rem;font-weight:600;letter-spacing:.04em;user-select:none;">What is BCNF?</summary><p style="color:var(--text2);font-size:.875rem;margin-top:.6rem;">A relation is in <strong>BCNF</strong> if for every non-trivial FD X→Y, X is a superkey.</p></details>`;
    html+=`<div style="margin-bottom:1rem"><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">BCNF Decomposition</strong>`;
    relationsBCNF.forEach(r=>{
      html+=`<div class="decomp-step"><span class="arrow-label">→</span>${schemaTag(r,'gold')}<span class="arrow-label" style="font-size:.75rem">${r.note||''}</span></div>`;
    });
    html+=`</div>`;
    html+=`<div><strong style="color:var(--text2);font-size:.8rem;text-transform:uppercase">BCNF Relations</strong><div style="margin-top:.4rem">${relationsBCNF.map(r=>schemaTag(r,'gold')).join('')}</div></div>`;
  }
  return makeCard('card-bcnf','badge-bcnf','BCNF','Boyce–Codd Normal Form',html,'card-bcnf',delay);
}

function buildConclusion(schema, candidateKeys, partials, relations2NF, relations3NF, relationsBCNF, allTransitive) {
  const name       = schema.name;
  const attrCount  = schema.attrs.length;
  const keyStr     = candidateKeys.map(k => `{${k.join(', ')}}`).join(' and ');
  const bcnfCount  = relationsBCNF.length;
  const r2Count    = relations2NF.length;
  const r3Count    = relations3NF.length;
  const hadPartial = partials.length > 0;
  const hadTrans   = allTransitive.length > 0;

  // ── Sentence 1: What was normalized ─────────────────────────────
  const s1 = `The relation <strong class="hl-teal">${name}</strong> with 
    <strong>${attrCount} attribute${attrCount > 1 ? 's' : ''}</strong> was 
    successfully normalized from its original unnormalized form through all 
    normal forms up to 
    <strong class="hl-gold">Boyce–Codd Normal Form (BCNF)</strong>.`;

  // ── Sentence 2: Candidate key info ──────────────────────────────
  const s2 = `The candidate key${candidateKeys.length > 1 ? 's' : ''} identified 
    ${candidateKeys.length > 1 ? 'were' : 'was'} <strong class="hl-purple">${keyStr}</strong>, 
    which ${candidateKeys.length > 1 ? 'serve' : 'serves'} as the minimal 
    superkey${candidateKeys.length > 1 ? 's' : ''} for the original relation.`;

  // ── Sentence 3: What anomalies were resolved ─────────────────────
  let s3 = '';
  if (hadPartial && hadTrans) {
    s3 = `During decomposition, <strong class="hl-red">${partials.length} partial 
      dependenc${partials.length > 1 ? 'ies' : 'y'}</strong> were removed to achieve 
      <strong class="hl-teal">2NF</strong>, and 
      <strong class="hl-red">${allTransitive.length} transitive 
      dependenc${allTransitive.length > 1 ? 'ies' : 'y'}</strong> were eliminated to 
      reach <strong class="hl-purple">3NF</strong>, resolving all insertion, update, 
      and deletion anomalies.`;
  } else if (hadPartial && !hadTrans) {
    s3 = `During decomposition, <strong class="hl-red">${partials.length} partial 
      dependenc${partials.length > 1 ? 'ies' : 'y'}</strong> were identified and 
      removed to achieve <strong class="hl-teal">2NF</strong>. No transitive 
      dependencies were found, so the relation was already in 
      <strong class="hl-purple">3NF</strong> after the 2NF decomposition.`;
  } else if (!hadPartial && hadTrans) {
    s3 = `No partial dependencies were found, so the relation was already in 
      <strong class="hl-teal">2NF</strong>. However, 
      <strong class="hl-red">${allTransitive.length} transitive 
      dependenc${allTransitive.length > 1 ? 'ies' : 'y'}</strong> were detected 
      and removed to achieve <strong class="hl-purple">3NF</strong>, eliminating 
      transitive data redundancy.`;
  } else {
    s3 = `No partial or transitive dependencies were detected — the original 
      relation was already in <strong class="hl-teal">3NF</strong>. Only minor 
      BCNF refinements were applied to ensure every functional dependency's 
      left-hand side is a superkey.`;
  }

  // ── Sentence 4: Final result ──────────────────────────────────────
  const unchanged = r2Count === 1 && r3Count === 1 && bcnfCount === 1;
  let s4 = '';
  if (unchanged) {
    s4 = `The final schema remains as a single fully normalized relation in 
      <strong class="hl-gold">BCNF</strong>, with no redundancy and complete 
      data integrity guaranteed.`;
  } else {
    const bcnfNames = relationsBCNF.map(r =>
      `<span class="hl-gold">${r.name}(${r.attrs.join(', ')})</span>`
    ).join(', ');
    s4 = `The final decomposition produced 
      <strong class="hl-green">${bcnfCount} independent BCNF relations</strong>: 
      ${bcnfNames} — each free from redundancy, ensuring data integrity and 
      eliminating all update, insertion, and deletion anomalies.`;
  }

  return `
    <div class="conclusion-box">
      <div class="conclusion-header">
        <span class="conclusion-icon">✦</span>
        <span class="conclusion-title">Conclusion</span>
      </div>
      <div class="conclusion-text">
        ${s1} ${s2}<br><br>${s3}<br><br>${s4}
      </div>
    </div>`;
}

function buildSummaryCard(schema, candidateKeys, partials, relations2NF, relations3NF, relationsBCNF, allTransitive, delay){
  let html=`
  <table class="sum-table">
    <thead><tr><th>Stage</th><th>Relations</th><th>Schemas</th></tr></thead>
    <tbody>
      <tr><td>Original (1NF)</td><td class="count">1</td><td>${schemaTag(schema)}</td></tr>
      <tr><td>2NF</td><td class="count">${relations2NF.length}</td><td>${relations2NF.map(r=>schemaTag(r)).join(' ')}</td></tr>
      <tr><td>3NF</td><td class="count">${relations3NF.length}</td><td>${relations3NF.map(r=>schemaTag(r,'purple')).join(' ')}</td></tr>
      <tr><td>BCNF</td><td class="count">${relationsBCNF.length}</td><td>${relationsBCNF.map(r=>schemaTag(r,'gold')).join(' ')}</td></tr>
    </tbody>
  </table>
  ${buildConclusion(schema, candidateKeys, partials, relations2NF, relations3NF, relationsBCNF, allTransitive)}
  <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem;">
    <button class="btn btn-ghost" id="copy-btn" onclick="copyOutput()">⎘ Copy Output</button>
    <button class="btn btn-secondary" onclick="generatePrintReport()">📄 Download Report</button>
    <button class="btn btn-ghost" style="margin-left:.5rem" onclick="generateSQL()">⟨/⟩ Generate SQL</button>
    <button class="btn btn-secondary" style="margin-left:.5rem" onclick="replayNormalization()">▶ Replay</button>
  </div>`;
  return makeCard('card-summary','badge-summary','SUMMARY','Normalization Summary',html,'card-summary',delay);
}

// ═══════════════════════════════════
//  MAIN ENTRY
// ═══════════════════════════════════
function runNormalization(){
  const alertBox=document.getElementById('input-alerts');
  alertBox.innerHTML='';
  const outputArea=document.getElementById('output-area');
  outputArea.innerHTML='';

  const schemaRaw=document.getElementById('schema-input').value.trim();
  const fdRaw=document.getElementById('fd-input').value.trim();

  // Validate schema
  if(!schemaRaw){
    alertBox.innerHTML=`<div class="alert alert-error shake">⚠ Please enter a relation schema (e.g. R(A, B, C, D)).</div>`;
    return;
  }
  const schema=parseSchema(schemaRaw);
  if(!schema){
    alertBox.innerHTML=`<div class="alert alert-error shake">⚠ Invalid schema format. Use: RelationName(A, B, C, D)</div>`;
    return;
  }

  // Parse FDs
  let fds=[];
  if(!fdRaw){
    alertBox.innerHTML=`<div class="alert alert-warn">ℹ No functional dependencies provided — relation is trivially in all normal forms.</div>`;
    fds=[];
  }else{
    fds=parseFDs(fdRaw);
  }

  // Validate FD attrs against schema
  const attrSet=new Set(schema.attrs);
  const unknowns=new Set();
  fds.forEach(fd=>[...fd.lhs,...fd.rhs].forEach(a=>{if(!attrSet.has(a))unknowns.add(a);}));
  if(unknowns.size){
    alertBox.innerHTML=`<div class="alert alert-warn">⚠ Unknown attribute(s) in FDs not found in schema: <strong style="color:#f87171">${[...unknowns].join(', ')}</strong>. These will be ignored.</div>`;
    fds=fds.map(fd=>({lhs:fd.lhs.filter(a=>attrSet.has(a)),rhs:fd.rhs.filter(a=>attrSet.has(a))})).filter(fd=>fd.lhs.length&&fd.rhs.length);
  }

  _globalAttrs=schema.attrs;
  _globalFDs=fds;
  _lastOriginalFDs=fds;

  // Compute
  const candidateKeys=fds.length?findCandidateKeys(schema.attrs,fds):[[...schema.attrs]];
  const partials=findPartialDeps(schema.attrs,candidateKeys,fds);
  const relations2NF=decomposeTo2NF(schema.name,schema.attrs,candidateKeys,fds);
  const relations3NF=decomposeTo3NF(relations2NF);
  const relationsBCNF=decomposeToBCNF(relations3NF);
  _lastBCNF=relationsBCNF;

  // Save to history
  saveToHistory(schemaRaw,fdRaw);

  // Compute transitive deps for complexity score
  const allTransitive=relations2NF.flatMap(r=>{
    const rKeys=findCandidateKeys(r.attrs,r.fds);
    return findTransitiveDeps(r.attrs,rKeys,r.fds);
  });

  // Generate cards (no delay needed)
  const cards=[
    ()=>buildParsedCard(schema,fds,0),
    ()=>buildClosureCard(schema.attrs,fds,0),
    ()=>buildKeysCard(schema.attrs,candidateKeys,fds,0),
    ()=>buildMinimalCoverCard(schema.attrs,fds,0),
    ()=>build1NFCard(schema,0),
    ()=>build2NFCard(schema,candidateKeys,fds,relations2NF,partials,0),
    ()=>build3NFCard(relations2NF,relations3NF,0),
    ()=>buildBCNFCard(relations3NF,relationsBCNF,0),
    ()=>buildLosslessCard(relationsBCNF,schema.attrs,fds,0),
    ()=>buildSummaryCard(schema, candidateKeys, partials, relations2NF, relations3NF, relationsBCNF, allTransitive, 0),
  ];

  window._runCardsList = cards.map(fn => fn());
  window._currentStepIndex = 0;

  document.getElementById('progress-wrap').style.display='none';
  const runBtn=document.getElementById('run-btn');
  runBtn.classList.remove('btn-processing');
  runBtn.textContent='▶ Run Normalization';

  window.renderCurrentStep();
}

window.renderCurrentStep = function() {
  const outputArea = document.getElementById('output-area');
  
  // Clear any existing cards and nav controls
  const existingCards = outputArea.querySelectorAll('.card');
  existingCards.forEach(c => c.remove());
  const existingNav = outputArea.querySelector('.step-nav-bar');
  if (existingNav) existingNav.remove();

  const currentCard = window._runCardsList[window._currentStepIndex];
  currentCard.style.animationDelay = '0ms';
  currentCard.classList.add('animation-done');
  
  outputArea.appendChild(currentCard);

  const navDiv = document.createElement('div');
  navDiv.className = 'step-nav-bar';
  navDiv.style.cssText = 'display:flex; justify-content:space-between; margin-top:1.5rem; align-items:center;';
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-secondary';
  prevBtn.textContent = '◀ Previous';
  if (window._currentStepIndex === 0) {
    prevBtn.style.opacity = '0.5';
    prevBtn.style.cursor = 'not-allowed';
  } else {
    prevBtn.onclick = () => { window._currentStepIndex--; window.renderCurrentStep(); };
  }
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary';
  if (window._currentStepIndex === window._runCardsList.length - 1) {
    nextBtn.textContent = 'Finish ✓';
    nextBtn.style.opacity = '0.5';
    nextBtn.style.cursor = 'not-allowed';
  } else {
    nextBtn.textContent = 'Next ▶';
    nextBtn.onclick = () => { window._currentStepIndex++; window.renderCurrentStep(); };
  }
  
  const stepLabel = document.createElement('div');
  stepLabel.style.cssText = 'color:var(--text3); font-size:0.9rem; font-weight:600;';
  stepLabel.textContent = `Step ${window._currentStepIndex + 1} of ${window._runCardsList.length}`;

  navDiv.appendChild(prevBtn);
  navDiv.appendChild(stepLabel);
  navDiv.appendChild(nextBtn);
  
  outputArea.appendChild(navDiv);

  // Automatically scroll to the top of the container so the user doesn't have to scroll manually
  setTimeout(() => {
    outputArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 10);
};

function loadExample(){
  const examples={
    student:{
      schema:'Student(StudentID, CourseID, CourseName, InstructorID, InstructorName, Grade)',
      fds:'StudentID, CourseID -> Grade\nCourseID -> CourseName, InstructorID\nInstructorID -> InstructorName'
    },
    employee:{
      schema:'Employee(EmpID, EmpName, DeptID, DeptName, ManagerID, ManagerName, Salary)',
      fds:'EmpID -> EmpName, DeptID, Salary\nDeptID -> DeptName, ManagerID\nManagerID -> ManagerName'
    },
    library:{
      schema:'Borrowing(MemberID, MemberName, BookID, BookTitle, AuthorID, AuthorName, BorrowDate)',
      fds:'MemberID -> MemberName\nBookID -> BookTitle, AuthorID\nAuthorID -> AuthorName\nMemberID, BookID -> BorrowDate'
    },
    order:{
      schema:'OrderItem(OrderID, CustomerID, CustomerName, ProductID, ProductName, CategoryID, CategoryName, Quantity, Price)',
      fds:'OrderID -> CustomerID\nCustomerID -> CustomerName\nProductID -> ProductName, CategoryID, Price\nCategoryID -> CategoryName\nOrderID, ProductID -> Quantity'
    }
  };
  const sel=document.getElementById('example-select').value;
  const ex=examples[sel];
  document.getElementById('schema-input').value=ex.schema;
  document.getElementById('fd-input').value=ex.fds;
  updateFDIndicators();
}

function clearAll(){
  document.getElementById('schema-input').value='';
  document.getElementById('fd-input').value='';
  document.getElementById('input-alerts').innerHTML='';
  document.getElementById('output-area').innerHTML='';
  _globalAttrs=[];_globalFDs=[];
}

function copyOutput(){
  const cards = window._runCardsList || [...document.querySelectorAll('#output-area .card')];
  let text='NormalizerPro — Normalization Output\n'+'='.repeat(40)+'\n\n';
  cards.forEach(card=>{
    const title=card.querySelector('.card-title')?.textContent||'';
    const badge=card.querySelector('.card-badge')?.textContent||'';
    text+=`[${badge}] ${title}\n${'-'.repeat(30)}\n`;
    
    // For non-attached DOM nodes, innerText doesn't format correctly,
    // so we extract text content in a way that preserves basic spacing.
    const bodyClone = card.querySelector('.card-body').cloneNode(true);
    const divsAndPs = bodyClone.querySelectorAll('div, p');
    divsAndPs.forEach(el => el.appendChild(document.createTextNode('\n')));
    
    text += bodyClone.textContent.replace(/\n\s*\n/g, '\n').trim();
    text+='\n\n';
  });
  navigator.clipboard.writeText(text).then(()=>{
    const btn=document.getElementById('copy-btn');
    if (!btn) return;
    const orig=btn.textContent;
    btn.textContent='✓ Copied!';
    btn.style.borderColor='var(--green)';btn.style.color='var(--green)';
    setTimeout(()=>{btn.textContent=orig;btn.style.borderColor='';btn.style.color='';},2000);
  }).catch(()=>alert('Could not copy to clipboard.'));
}

function buildStatsBar(attrs,candidateKeys,relations2NF,relations3NF,relationsBCNF,partials,transitiveDeps){
  partials=partials||[];
  transitiveDeps=transitiveDeps||[];
  const score=(attrs.length*2)+(_globalFDs.length*3)+(partials.length*4)+(transitiveDeps.length*4);
  let scoreColor='var(--green)',scoreLabel='Simple';
  if(score>40){scoreColor='var(--red)';scoreLabel='Complex';}
  else if(score>20){scoreColor='var(--gold)';scoreLabel='Moderate';}
  const div=document.createElement('div');
  div.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);gap:.75rem;margin-bottom:.5rem;animation:fadeUp .4s ease forwards;';
  const stats=[
    {label:'Attributes',value:attrs.length,color:'var(--teal)'},
    {label:'2NF Relations',value:relations2NF.length,color:'var(--teal)'},
    {label:'3NF Relations',value:relations3NF.length,color:'var(--purple)'},
    {label:'BCNF Relations',value:relationsBCNF.length,color:'var(--gold)'},
    {label:scoreLabel+' Schema',value:score,color:scoreColor,title:'Score = attrs×2 + FDs×3 + partialDeps×4 + transitiveDeps×4'},
  ];
  div.innerHTML=stats.map(s=>`<div title="${s.title||''}" style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem;text-align:center;cursor:${s.title?'help':'default'}"><div style="font-size:1.4rem;font-weight:700;font-family:var(--mono);color:${s.color}">${s.value}</div><div style="font-size:.7rem;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-top:.2rem">${s.label}</div></div>`).join('');
  return div;
}

// ═══════════════════
// MINIMAL COVER
// ═══════════════════

function buildMinimalCoverCard(attrs,fds,delay){
  const{minimal,steps}=computeMinimalCover(fds,attrs);
  let html=`<p style="color:var(--text2);font-size:.875rem;margin-bottom:1rem">The <strong>Minimal Cover</strong> (canonical cover) is the smallest equivalent set of FDs with no redundancy.</p>`;
  
  steps.forEach(step=>{
    html+=`<div style="margin-bottom:1.5rem; background: rgba(0,0,0,0.1); padding: 1rem; border-radius: 8px;">`;
    html+=`<div style="font-size:.78rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.6rem">${step.title}</div>`;
    
    // Detailed logs
    if(step.logs && step.logs.length > 0) {
      html+=`<div style="font-family: var(--mono); font-size: 0.82rem; color: var(--text3); margin-bottom: 0.8rem; line-height: 1.4; border-left: 2px solid var(--border); padding-left: 0.6rem;">`;
      step.logs.forEach(log => {
        let l = log.replace(/NOT redundant/g, '<span style="color:var(--green)">NOT redundant</span>')
                   .replace(/Removed/g, '<span style="color:var(--red)">Removed</span>')
                   .replace(/Retained/g, '<span style="color:var(--green)">Retained</span>')
                   .replace(/extraneous/g, '<span style="color:var(--gold)">extraneous</span>')
                   .replace(/redundant/g, '<span style="color:var(--gold)">redundant</span>');
        html+=`<div>${l}</div>`;
      });
      html+=`</div>`;
    }

    // Surviving FDs
    html+=`<div>${step.fds.length?step.fds.map(fd=>fdStr(fd)).join(''):'<span style="color:var(--text3);font-size:.85rem">No FDs remain</span>'}</div>`;
    html+=`</div>`;
  });

  html+=`<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)"><div style="font-size:.78rem;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.4rem">✓ Final Minimal Cover</div><div>${minimal.length?minimal.map(fd=>fdStr(fd)).join(''):'<span style="color:var(--text3)">Empty (no non-trivial FDs)</span>'}</div></div>`;
  
  return makeCard('card-minimal','badge-minimal','CANONICAL COVER','Canonical Cover of FDs',html,'card-minimal',delay);
}

// ═══════════════════
// LOSSLESS + DEPENDENCY PRESERVATION
// ═══════════════════
function checkLosslessJoin(relations,originalAttrs,fds){
  if(relations.length===2){
    const r1=new Set(relations[0].attrs),r2=new Set(relations[1].attrs);
    const inter=[...r1].filter(a=>r2.has(a));
    if(!inter.length)return{lossless:false,reason:'No common attributes between relations — join would produce spurious tuples.'};
    const{closure}=computeClosure(inter,fds);
    const r1Sub=[...r1].every(a=>closure.has(a)),r2Sub=[...r2].every(a=>closure.has(a));
    if(r1Sub||r2Sub)return{lossless:true,reason:`Common attributes {${inter.join(', ')}} functionally determine ${r1Sub?relations[0].name:relations[1].name} — lossless join guaranteed.`};
    return{lossless:false,reason:`Common attributes {${inter.join(', ')}} do not determine either relation completely.`};
  }
  let allLossless=true;
  const reasons=[];
  for(let i=0;i<relations.length;i++){
    for(let j=i+1;j<relations.length;j++){
      const ri=new Set(relations[i].attrs),rj=new Set(relations[j].attrs);
      const inter=[...ri].filter(a=>rj.has(a));
      if(inter.length){
        const{closure}=computeClosure(inter,fds);
        if([...ri].every(a=>closure.has(a))||[...rj].every(a=>closure.has(a)))reasons.push(`${relations[i].name} ∩ ${relations[j].name} = {${inter.join(',')}} ✓`);
        else{reasons.push(`${relations[i].name} ∩ ${relations[j].name} = {${inter.join(',')}} — may not be lossless`);allLossless=false;}
      }
    }
  }
  return{lossless:allLossless,reason:reasons.join('<br>')||'Single relation — trivially lossless.'};
}

function checkDependencyPreservation(relations,originalFDs){
  const preserved=[],lost=[];
  originalFDs.forEach(fd=>{
    let z=new Set(fd.lhs);
    let changed=true;
    while(changed){
      changed=false;
      for(const rel of relations){
        const ri=new Set(rel.attrs);
        const z_int_ri=[...z].filter(a=>ri.has(a));
        if(!z_int_ri.length)continue;
        const{closure}=computeClosure(z_int_ri,originalFDs);
        const t=[...closure].filter(a=>ri.has(a));
        for(const a of t){
          if(!z.has(a)){
            z.add(a);
            changed=true;
          }
        }
      }
    }
    const isPreserved=fd.rhs.every(a=>z.has(a));
    const inRel=relations.some(r=>{
      const s=new Set(r.attrs);
      return fd.lhs.every(a=>s.has(a))&&fd.rhs.every(a=>s.has(a));
    });
    if(isPreserved)preserved.push({fd,derived:!inRel});else lost.push(fd);
  });
  return{preserved,lost};
}

function buildLosslessCard(relationsBCNF,originalAttrs,originalFDs,delay){
  const lossless=checkLosslessJoin(relationsBCNF,originalAttrs,originalFDs);
  const depPres=checkDependencyPreservation(relationsBCNF,originalFDs);
  let html=`<div style="margin-bottom:1.5rem"><div style="font-size:.78rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.6rem">Lossless Join Property</div><div class="alert ${lossless.lossless?'alert-info':'alert-warn'}" style="margin-bottom:.5rem">${lossless.lossless?'✓':'⚠'} <strong>${lossless.lossless?'Lossless':'Potentially Lossy'}</strong></div><div style="font-size:.85rem;color:var(--text2);line-height:1.7">${lossless.reason}</div></div>`;
  html+=`<div><div style="font-size:.78rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.6rem">Dependency Preservation</div>`;
  if(depPres.preserved.length)html+=`<div style="margin-bottom:.6rem"><span style="font-size:.75rem;color:var(--green);font-weight:600">PRESERVED (${depPres.preserved.length})</span><div style="margin-top:.3rem">${depPres.preserved.map(p=>`<span class="schema-box" style="margin:.2rem;display:inline-flex;align-items:center;gap:.3rem;${p.derived?'border-color:var(--gold);color:var(--gold)':''}"><span style="letter-spacing:1px">${p.fd.lhs.join(',')}</span><span class="arrow-label">→</span><span style="letter-spacing:1px">${p.fd.rhs.join(',')}</span>${p.derived?'<span style="font-size:0.65rem;text-transform:uppercase;margin-left:4px">(Derived)</span>':''}</span>`).join('')}</div></div>`;
  if(depPres.lost.length)html+=`<div><span style="font-size:.75rem;color:var(--red);font-weight:600">NOT PRESERVED (${depPres.lost.length})</span><div style="margin-top:.3rem">${depPres.lost.map(fd=>fdStr(fd)).join('')}</div><p style="font-size:.8rem;color:var(--text3);margin-top:.5rem">⚠ Note: BCNF decomposition does not always preserve all FDs. This is a known trade-off vs 3NF which always preserves FDs.</p></div>`;
  if(!depPres.lost.length)html+=`<div class="alert alert-info">✓ All original FDs are preserved in the decomposed relations.</div>`;
  html+=`</div>`;
  return makeCard('card-lossless','badge-lossless','PROPERTIES','Lossless Join & Dependency Preservation',html,'card-lossless',delay);
}

// ═══════════════════
// PRINT REPORT
// ═══════════════════
function generatePrintReport(){
  if(!_lastBCNF||!_lastBCNF.length){alert('Run normalization first.');return;}
  const schemaEl=document.getElementById('schema-input').value.trim();
  const schema=parseSchema(schemaEl);
  if(!schema)return;
  const candidateKeys=findCandidateKeys(schema.attrs,_globalFDs);
  const prime=new Set(candidateKeys.flat());
  const partials=findPartialDeps(schema.attrs,candidateKeys,_globalFDs);
  const relations2NF=decomposeTo2NF(schema.name,schema.attrs,candidateKeys,_globalFDs);
  const relations3NF=decomposeTo3NF(relations2NF);
  const{minimal}=computeMinimalCover(_globalFDs,schema.attrs);
  const lossless=checkLosslessJoin(_lastBCNF,schema.attrs,_globalFDs);
  const depPres=checkDependencyPreservation(_lastBCNF,_globalFDs);
  let sqlText='';
  _lastBCNF.forEach((rel)=>{
    const keys=findCandidateKeys(rel.attrs,rel.fds);
    const pk=keys.length?keys[0]:[rel.attrs[0]];
    sqlText+=`CREATE TABLE ${rel.name} (\n`;
    rel.attrs.forEach(attr=>{
      const lower=attr.toLowerCase();
      let type='VARCHAR(100)';
      if(lower.includes('id'))type='INT';
      if(lower.includes('date')||lower.includes('time'))type='DATE';
      if(lower.includes('salary')||lower.includes('price')||lower.includes('fare'))type='DECIMAL(10,2)';
      if(lower.includes('qty')||lower.includes('quantity')||lower.includes('count'))type='INT';
      sqlText+=`    ${attr.padEnd(22)}${type}${pk.includes(attr)?'  NOT NULL':''},\n`;
    });
    sqlText+=`    PRIMARY KEY (${pk.join(', ')})\n);\n\n`;
  });
function buildConclusionPlainText(schema, candidateKeys, partials, relations2NF, relations3NF, relationsBCNF, allTransitive) {
  const name      = schema.name;
  const attrCount = schema.attrs.length;
  const keyStr    = candidateKeys.map(k => `{${k.join(', ')}}`).join(' and ');
  const bcnfCount = relationsBCNF.length;
  const hadPartial = partials.length > 0;
  const hadTrans   = allTransitive.length > 0;

  const s1 = `The relation ${name} with ${attrCount} attribute${attrCount > 1 ? 's' : ''} was successfully normalized from its original unnormalized form through all normal forms up to Boyce–Codd Normal Form (BCNF).`;

  const s2 = `The candidate key${candidateKeys.length > 1 ? 's' : ''} identified ${candidateKeys.length > 1 ? 'were' : 'was'} ${keyStr}, which ${candidateKeys.length > 1 ? 'serve' : 'serves'} as the minimal superkey${candidateKeys.length > 1 ? 's' : ''} for the original relation.`;

  let s3 = '';
  if (hadPartial && hadTrans) {
    s3 = `During decomposition, ${partials.length} partial dependenc${partials.length > 1 ? 'ies' : 'y'} were removed to achieve 2NF, and ${allTransitive.length} transitive dependenc${allTransitive.length > 1 ? 'ies' : 'y'} were eliminated to reach 3NF, resolving all insertion, update, and deletion anomalies.`;
  } else if (hadPartial) {
    s3 = `During decomposition, ${partials.length} partial dependenc${partials.length > 1 ? 'ies' : 'y'} were identified and removed to achieve 2NF. No transitive dependencies were found, so the relation was already in 3NF after the 2NF decomposition.`;
  } else if (hadTrans) {
    s3 = `No partial dependencies were found, so the relation was already in 2NF. However, ${allTransitive.length} transitive dependenc${allTransitive.length > 1 ? 'ies' : 'y'} were detected and removed to achieve 3NF.`;
  } else {
    s3 = `No partial or transitive dependencies were detected — the original relation was already in 3NF. Only minor BCNF refinements were applied.`;
  }

  const bcnfNames = relationsBCNF.map(r => `${r.name}(${r.attrs.join(', ')})`).join(', ');
  const s4 = `The final decomposition produced ${bcnfCount} independent BCNF relation${bcnfCount > 1 ? 's' : ''}: ${bcnfNames} — each free from redundancy, ensuring data integrity and eliminating all anomalies.`;

  return `${s1} ${s2} ${s3} ${s4}`;
}

  const now=new Date().toLocaleString();
  const dateStr=new Date().toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'});
  
  const allTransitive=relations2NF.flatMap(r=>{const rk=findCandidateKeys(r.attrs,r.fds);return findTransitiveDeps(r.attrs,rk,r.fds);});
  const conclusionText = buildConclusionPlainText(schema, candidateKeys, partials, relations2NF, relations3NF, _lastBCNF, allTransitive);
  
  const reportHTML=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Normalization Report — ${schema.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1a1a2e;background:#fff;line-height:1.6;}
  .cover{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:3rem;border-bottom:3px solid #0f766e;page-break-after:always;}
  .cover-logo{font-size:14pt;font-weight:700;color:#0f766e;letter-spacing:.15em;text-transform:uppercase;margin-bottom:3rem;border:2px solid #0f766e;padding:.5rem 2rem;border-radius:4px;}
  .cover-title{font-size:28pt;font-weight:700;color:#1a1a2e;margin-bottom:1rem;line-height:1.2;}
  .cover-subtitle{font-size:14pt;color:#475569;margin-bottom:3rem;}
  .cover-relation{background:#f0fdf9;border:1.5px solid #0f766e;border-radius:8px;padding:1.5rem 3rem;margin:2rem 0;font-family:'Courier New',monospace;font-size:13pt;color:#0f766e;font-weight:700;word-break:break-all;}
  .cover-meta{margin-top:3rem;font-size:10.5pt;color:#64748b;line-height:2;}
  .cover-meta strong{color:#1a1a2e;}
  .page-header{display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:2px solid #0f766e;margin-bottom:1.5rem;font-size:9pt;color:#64748b;}
  .page-header .brand{font-weight:700;color:#0f766e;font-size:10pt;}
  .section{margin-bottom:2rem;page-break-inside:avoid;}
  .section-title{font-size:13pt;font-weight:700;color:#0f766e;border-left:4px solid #0f766e;padding-left:.75rem;margin-bottom:1rem;text-transform:uppercase;letter-spacing:.05em;}
  .sub-title{font-size:10pt;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.5rem;margin-top:1rem;}
  table{width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:1rem;}
  th{background:#f0fdf9;color:#0f766e;font-weight:700;padding:.5rem .75rem;border:1px solid #d1fae5;text-align:left;font-size:9.5pt;text-transform:uppercase;letter-spacing:.05em;}
  td{padding:.45rem .75rem;border:1px solid #e2e8f0;vertical-align:top;}
  tr:nth-child(even) td{background:#f8fafc;}
  .chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.3rem;}
  .chip{display:inline-block;font-family:'Courier New',monospace;font-size:9.5pt;border:1.5px solid #0f766e;border-radius:5px;padding:.2rem .65rem;color:#0f766e;background:#f0fdf9;font-weight:600;word-break:break-all;}
  .chip.purple{border-color:#6d28d9;color:#6d28d9;background:#f5f3ff;}
  .chip.gold{border-color:#b45309;color:#b45309;background:#fffbeb;}
  .chip.blue{border-color:#1d4ed8;color:#1d4ed8;background:#eff6ff;}
  .chip.red{border-color:#dc2626;color:#dc2626;background:#fef2f2;}
  .chip.key{border-color:#6d28d9;color:#6d28d9;background:#f5f3ff;}
  .fd{display:inline-block;font-family:'Courier New',monospace;font-size:9.5pt;border:1px solid #cbd5e1;border-radius:4px;padding:.15rem .55rem;color:#334155;background:#f8fafc;margin:.15rem;}
  .fd-arrow{color:#0f766e;font-weight:700;margin:0 .2rem;}
  .alert{border-radius:6px;padding:.6rem 1rem;margin-bottom:.75rem;font-size:10pt;display:flex;align-items:flex-start;gap:.5rem;}
  .alert-ok{background:#f0fdf9;border:1px solid #6ee7b7;color:#065f46;}
  .alert-warn{background:#fffbeb;border:1px solid #fcd34d;color:#92400e;}
  .alert-info{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;}
  .code-block{background:#1e293b;color:#e2e8f0;font-family:'Courier New',monospace;font-size:9pt;padding:1rem;border-radius:6px;white-space:pre;overflow-x:auto;line-height:1.7;}
  .code-kw{color:#7dd3fc;}
  .code-tbl{color:#34d399;font-weight:700;}
  .code-col{color:#e2e8f0;}
  .code-type{color:#fbbf24;}
  .code-pk{color:#f472b6;}
  .code-fk{color:#a78bfa;}
  .pagebreak{page-break-before:always;padding-top:1.5rem;}
  .sum-stage{font-weight:700;color:#334155;}
  .sum-count{font-weight:700;color:#0f766e;text-align:center;font-size:12pt;}
  .report-footer{margin-top:3rem;padding-top:1rem;border-top:1.5px solid #e2e8f0;font-size:9pt;color:#94a3b8;display:flex;justify-content:space-between;}
  @media print{
    body{font-size:10.5pt;}
    .no-print{display:none!important;}
    .cover{min-height:auto;padding:2rem;}
    a{color:inherit;text-decoration:none;}
  }
</style>
</head>
<body>
<div class="no-print" style="position:fixed;top:1rem;right:1rem;z-index:100;display:flex;gap:.5rem;">
  <button onclick="window.print()" style="background:#0f766e;color:#fff;border:none;border-radius:8px;padding:.6rem 1.25rem;font-size:.9rem;font-weight:600;cursor:pointer;">🖨 Print / Save PDF</button>
  <button onclick="window.close()" style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;padding:.6rem 1rem;font-size:.9rem;cursor:pointer;">✕ Close</button>
</div>
<div class="cover">
  <div class="cover-logo">NormalizerPro</div>
  <div class="cover-title">Database Normalization<br>Analysis Report</div>
  <div class="cover-subtitle">DBMS Innovative Assignment — Normalization Tool</div>
  <div class="cover-relation">${schema.name}(${schema.attrs.join(', ')})</div>
  <div class="cover-meta">
    <strong>Student IDs:</strong> 24BCE380 &amp; 24BCE374<br>
    <strong>Course:</strong> Database Management Systems (DBMS)<br>
    <strong>Institution:</strong> Nirma University, Ahmedabad<br>
    <strong>Generated:</strong> ${dateStr}<br>
    <strong>Tool:</strong> NormalizerPro — DBMS Normalization Engine
  </div>
</div>
<div style="padding:0 2.5rem;">
<div class="page-header"><span class="brand">NormalizerPro</span><span>${schema.name} — Normalization Report</span><span>${dateStr}</span></div>
<div class="section">
  <div class="section-title">1. Input Schema &amp; Functional Dependencies</div>
  <div class="sub-title">Relation Schema</div>
  <div class="chip" style="font-size:10.5pt;padding:.4rem 1rem;">${schema.name}(${schema.attrs.join(', ')})</div>
  <div class="sub-title">Functional Dependencies</div>
  <table>
    <thead><tr><th>#</th><th>Left-Hand Side (Determinant)</th><th>→</th><th>Right-Hand Side (Dependent)</th></tr></thead>
    <tbody>${_globalFDs.map((fd,i)=>`<tr><td>${i+1}</td><td><code>${fd.lhs.join(', ')}</code></td><td style="text-align:center;color:#0f766e;font-weight:700;">→</td><td><code>${fd.rhs.join(', ')}</code></td></tr>`).join('')}</tbody>
  </table>
</div>
<div class="section">
  <div class="section-title">2. Candidate Keys &amp; Attribute Classification</div>
  <div class="sub-title">Candidate Keys</div>
  <div class="chips">${candidateKeys.map(k=>`<span class="chip key">{${k.join(', ')}}</span>`).join('')}</div>
  <table style="margin-top:1rem;">
    <thead><tr><th>Attribute</th><th>Type</th><th>In Candidate Key?</th></tr></thead>
    <tbody>${schema.attrs.map(a=>`<tr><td><code>${a}</code></td><td>${prime.has(a)?'<strong style="color:#0f766e">Prime</strong>':'Non-Prime'}</td><td style="text-align:center">${prime.has(a)?'✓':'—'}</td></tr>`).join('')}</tbody>
  </table>
</div>
<div class="section pagebreak">
  <div class="section-title">3. Minimal Cover (Canonical Cover)</div>
  <p style="font-size:10pt;color:#475569;margin-bottom:1rem;">The minimal cover is the smallest equivalent set of FDs — no redundant FDs and no extraneous attributes in any LHS.</p>
  <div class="sub-title">Final Minimal Cover</div>
  <div class="chips">${minimal.length?minimal.map(fd=>`<span class="fd">${fd.lhs.join(', ')}<span class="fd-arrow">→</span>${fd.rhs.join(', ')}</span>`).join(''):'<span style="color:#64748b;font-size:10pt;">No non-trivial FDs remain.</span>'}</div>
</div>
<div class="section">
  <div class="section-title">4. First Normal Form (1NF)</div>
  <div class="alert alert-ok">✓ The relation <strong>${schema.name}</strong> is in <strong>1NF</strong>. All attributes are assumed to have atomic domains.</div>
</div>
<div class="section">
  <div class="section-title">5. Second Normal Form (2NF)</div>
  ${partials.length===0?`<div class="alert alert-ok">✓ No partial dependencies found. The relation is already in 2NF.</div>`:`<p style="font-size:10pt;color:#475569;margin-bottom:.75rem;">A relation is in 2NF if it is in 1NF and has no partial dependencies — no non-prime attribute depends on a proper subset of any candidate key.</p><div class="sub-title">Partial Dependencies Detected</div><table><thead><tr><th>Determinant (LHS)</th><th>Dependent (RHS)</th><th>Key Violated</th></tr></thead><tbody>${partials.map(p=>`<tr><td><code>${p.lhs.join(', ')}</code></td><td><code>${p.rhs.join(', ')}</code></td><td><code>{${p.key.join(', ')}}</code></td></tr>`).join('')}</tbody></table><div class="sub-title">2NF Decomposed Relations</div><div class="chips">${relations2NF.map(r=>`<span class="chip">${r.name}(${r.attrs.join(', ')})</span>`).join('')}</div>`}
</div>
<div class="section pagebreak">
  <div class="section-title">6. Third Normal Form (3NF)</div>
  ${(()=>{
    const allTrans=relations2NF.flatMap(r=>{const rk=findCandidateKeys(r.attrs,r.fds);return findTransitiveDeps(r.attrs,rk,r.fds);});
    if(!allTrans.length)return `<div class="alert alert-ok">✓ No transitive dependencies found. Relations are already in 3NF.</div><div class="chips">${relations3NF.map(r=>`<span class="chip purple">${r.name}(${r.attrs.join(', ')})</span>`).join('')}</div>`;
    return `<p style="font-size:10pt;color:#475569;margin-bottom:.75rem;">A relation is in 3NF if it is in 2NF and has no transitive dependencies.</p><div class="sub-title">Transitive Dependencies Detected</div><table><thead><tr><th>LHS</th><th>RHS</th></tr></thead><tbody>${allTrans.map(t=>`<tr><td><code>${t.lhs.join(', ')}</code></td><td><code>${t.rhs.join(', ')}</code></td></tr>`).join('')}</tbody></table><div class="sub-title">3NF Decomposed Relations</div><div class="chips">${relations3NF.map(r=>`<span class="chip purple">${r.name}(${r.attrs.join(', ')})</span>`).join('')}</div>`;
  })()}
</div>
<div class="section">
  <div class="section-title">7. Boyce–Codd Normal Form (BCNF)</div>
  <p style="font-size:10pt;color:#475569;margin-bottom:.75rem;">A relation is in BCNF if for every non-trivial FD X → Y, X is a superkey.</p>
  <div class="sub-title">BCNF Decomposed Relations</div>
  <table>
    <thead><tr><th>Relation</th><th>Attributes</th><th>Primary Key</th></tr></thead>
    <tbody>${_lastBCNF.map(r=>{const rk=findCandidateKeys(r.attrs,r.fds);const pk=rk.length?rk[0]:[r.attrs[0]];return `<tr><td><strong>${r.name}</strong></td><td>${r.attrs.map(a=>`<code>${a}</code>`).join(', ')}</td><td><code>{${pk.join(', ')}}</code></td></tr>`;}).join('')}</tbody>
  </table>
</div>
<div class="section pagebreak">
  <div class="section-title">8. Lossless Join &amp; Dependency Preservation</div>
  <div class="sub-title">Lossless Join</div>
  <div class="alert ${lossless.lossless?'alert-ok':'alert-warn'}">${lossless.lossless?'✓ Lossless':'⚠ Potentially Lossy'} — ${lossless.reason.replace(/<br>/g,' ')}</div>
  <div class="sub-title">Dependency Preservation</div>
  ${depPres.preserved.length?`<p style="font-size:10pt;color:#065f46;font-weight:600;margin-bottom:.35rem;">Preserved FDs (${depPres.preserved.length})</p><div class="chips">${depPres.preserved.map(p=>`<span class="fd" ${p.derived?'style="border-color:#d97706;color:#d97706;"':''}>${p.fd.lhs.join(',')}<span class="fd-arrow" ${p.derived?'style="color:#d97706;"':''}>→</span>${p.fd.rhs.join(',')}${p.derived?' <span style="font-size:8pt;opacity:0.8;">(Derived)</span>':''}</span>`).join('')}</div>`:``}
  ${depPres.lost.length?`<p style="font-size:10pt;color:#92400e;font-weight:600;margin:.75rem 0 .35rem;">Not Preserved (${depPres.lost.length}) — Known BCNF trade-off</p><div class="chips">${depPres.lost.map(fd=>`<span class="fd" style="border-color:#fca5a5;color:#dc2626;">${fd.lhs.join(',')}<span class="fd-arrow" style="color:#dc2626;">→</span>${fd.rhs.join(',')}</span>`).join('')}</div><p style="font-size:9.5pt;color:#92400e;margin-top:.5rem;">Note: BCNF does not always preserve all FDs. 3NF decomposition always preserves FDs but may not achieve BCNF.</p>`:`<div class="alert alert-ok">✓ All original FDs are preserved in the decomposed relations.</div>`}
</div>
<div class="section">
  <div class="section-title">9. Normalization Summary</div>
  <table class="sum-table">
    <thead><tr><th>Stage</th><th style="text-align:center">Relations</th><th>Schemas</th></tr></thead>
    <tbody>
      <tr><td class="sum-stage">Original (1NF)</td><td class="sum-count">1</td><td><span class="chip blue">${schema.name}(${schema.attrs.join(', ')})</span></td></tr>
      <tr><td class="sum-stage">2NF</td><td class="sum-count">${relations2NF.length}</td><td><div class="chips">${relations2NF.map(r=>`<span class="chip">${r.name}(${r.attrs.join(', ')})</span>`).join('')}</div></td></tr>
      <tr><td class="sum-stage">3NF</td><td class="sum-count">${relations3NF.length}</td><td><div class="chips">${relations3NF.map(r=>`<span class="chip purple">${r.name}(${r.attrs.join(', ')})</span>`).join('')}</div></td></tr>
      <tr><td class="sum-stage">BCNF</td><td class="sum-count">${_lastBCNF.length}</td><td><div class="chips">${_lastBCNF.map(r=>`<span class="chip gold">${r.name}(${r.attrs.join(', ')})</span>`).join('')}</div></td></tr>
    </tbody>
  </table>
</div>
<div class="section">
  <div class="section-title">10. Conclusion</div>
  <p style="font-size:10.5pt;line-height:1.8;color:#334155;">${conclusionText}</p>
</div>
<div class="section pagebreak">
  <div class="section-title">11. Generated SQL — CREATE TABLE Statements</div>
  <p style="font-size:10pt;color:#475569;margin-bottom:1rem;">SQL statements for all BCNF relations with inferred data types and primary keys.</p>
  <div class="code-block">${sqlText.replace(/CREATE TABLE (\\w+)/g,'<span class="code-kw">CREATE TABLE</span> <span class="code-tbl">$1</span>').replace(/PRIMARY KEY/g,'<span class="code-pk">PRIMARY KEY</span>').replace(/FOREIGN KEY/g,'<span class="code-fk">FOREIGN KEY</span>').replace(/\\b(INT|VARCHAR\\(\\d+\\)|DATE|DECIMAL\\(\\d+,\\d+\\))\\b/g,'<span class="code-type">$1</span>').replace(/NOT NULL/g,'<span class="code-kw">NOT NULL</span>')}</div>
</div>
<div class="report-footer"><span>NormalizerPro — DBMS Normalization Engine</span><span>24BCE380 &amp; 24BCE374 | Nirma University</span><span>Generated: ${now}</span></div>
</div>
</body>
</html>`;
  const win=window.open('','_blank','width=900,height=700');
  win.document.write(reportHTML);
  win.document.close();
  win.focus();
}

// ═══════════════════
// SQL GENERATOR
// ═══════════════════
export async function runEncodingCheck({go,api}){
 const report={version:'0.7.4',checks:[]};
 try{
  const data=await api.home();await go({name:'home'});
  const labels=[...document.querySelectorAll('#navigation button,.row-heading h2,.home-more-sections')].map(x=>x.textContent);
  report.checks.push({name:'no-corrupt-interface-labels',pass:labels.every(x=>!x.includes('\uFFFD')&&!x.includes('???'))});
  const more=document.querySelector('[data-focus="home-more-sections"]');
  if(data.rows.length>5)report.checks.push({name:'arabic-more-sections',pass:more?.textContent==='المزيد من الأقسام'});
  const resume=document.querySelector('[data-focus-group="resume"]');
  if(resume)report.checks.push({name:'arabic-resume-heading',pass:resume.closest('section').querySelector('h2').textContent==='أكمل من حيث توقفت'});
  report.pass=report.checks.every(x=>x.pass);report.labels=labels;
 }catch(e){report.pass=false;report.error=e.message}
 document.title='ENCODING_CHECK:'+JSON.stringify(report);
}

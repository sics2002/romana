export async function runNewsCheck(app) {
  const report={version:'0.3.0',simulation:'probe rejection injected for this developer launch only',userAgent:navigator.userAgent,checks:[]};
  const publish=()=>document.title='CINEMANA_NEWS_CHECK:'+JSON.stringify(report);
  const record=(name,pass,details={})=>{report.checks.push({name,pass,...details});publish();if(!pass)throw Error(name)};
  const wait=async fn=>{const started=Date.now();while(!fn()){if(Date.now()-started>30000)throw Error('timeout');await new Promise(resolve=>setTimeout(resolve,100))}};
  try{
    record('automatic-fallback',document.documentElement.dataset.mode==='news',{startupMs:Number(document.documentElement.dataset.startupMs)});
    await wait(()=>app.rows.some(row=>row.id==='film')&&app.rows.some(row=>['netflix','warner'].includes(row.id))&&app.rows.some(row=>row.id==='series'));
    record('live-publisher-feeds',app.rows.some(row=>row.id==='film'),{rows:app.rows.map(row=>({source:row.id,items:row.items.length}))});
    record('no-cinemana-menu',!document.querySelector('[data-focus="nav-movies"]'));
    const card=document.querySelector('.news-card');app.focus.focus(card.dataset.focus);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',keyCode:37,bubbles:true,cancelable:true}));
    record('remote-catalog-navigation',document.activeElement?.dataset.focus!==card.dataset.focus);
    const selected=document.activeElement;selected.click();record('news-details',Boolean(document.querySelector('.news-detail')));
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:461,bubbles:true,cancelable:true}));
    record('back-restores-focus',document.activeElement?.dataset.focus===selected.dataset.focus);
    const trailers=app.rows.filter(row=>['netflix','warner'].includes(row.id)).flatMap(row=>row.items);
    record('official-trailer-links',trailers.length>0&&trailers.every(item=>/^[\w-]{11}$/.test(item.youtubeId)),{count:trailers.length});
    app.route='series';app.render();const image=document.querySelector('.news-card img');await wait(()=>image?.naturalWidth>0);
    record('series-poster-loaded',image.naturalWidth>0,{width:image.naturalWidth});
    record('news-cached',Boolean(localStorage.getItem('cinemana-tv.news.v1')));
    app.route='home';app.render();report.pass=true;
  }catch(error){report.pass=false;report.error=error.message}
  report.finishedAt=new Date().toISOString();publish();
}

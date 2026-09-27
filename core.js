(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STANDARD=[
    {id:'review',title:'四级词汇，先复习再学新词',minutes:5,description:'打开四级词卡，先回忆到期的旧词，再学少量新词。先猜意思，再翻开释义；熟悉的可以直接标记。',tip:'四级优先，六级和雅思排在后面。'},
    {id:'listen',title:'认真听懂一小段',minutes:15,description:'选一段带文本的 1—2 分钟音频。先完整听，再分句对照文本找出没听懂的地方，最后不看文本重听。',tip:'校园、日常或简单商业话题都可以。'},
    {id:'speak',title:'把听到的，说出来',minutes:10,description:'跟读其中 3—5 句。关掉文本，用自己的话复述 30—60 秒。用手机录下来，再听一次，改进一个地方。',tip:'先讲清意思，不要求一次说得完美。'},
    {id:'write',title:'用自己的话留个记录',minutes:10,description:'围绕材料写 3—5 句英文，检查时态和句子是否完整，修改一个问题，留下最多 3 个值得复习的表达。',tip:'先自己写，再借助工具检查。'}
  ];
  const LIGHT=[
    {id:'listen',title:'听一段熟悉的材料',minutes:5,description:'重听之前练过的短音频，对照文本补上没听清的地方。',tip:'今天轻一点，也算数。'},
    {id:'speak',title:'开口跟读几句话',minutes:3,description:'挑出 3 句跟读，试着模仿停顿和语气。',tip:'慢一点，读清楚。'},
    {id:'review',title:'复习两个旧表达',minutes:2,description:'遮住英文回忆两个表达，再用其中一个说句话。',tip:'明天再回到平常的节奏。'}
  ];
  const today=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  function validDate(s){if(typeof s!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s;}
  function shift(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function weekday(s){return new Date(s+'T12:00:00Z').getUTCDay();}
  function week(s){const start=shift(s,-((weekday(s)+6)%7));return Array.from({length:7},(_,i)=>shift(start,i));}
  const empty=()=>({version:1,days:{},vocab:{}});
  const day=(state,date)=>state.days[date]||{mode:'standard',checks:[],note:''};
  const tasks=mode=>mode==='light'?LIGHT:STANDARD;
  function progress(record){const list=tasks(record.mode),minutes=list.reduce((sum,t)=>sum+(record.checks.includes(record.mode+':'+t.id)?t.minutes:0),0);return {minutes,target:record.mode==='light'?10:40,done:list.every(t=>record.checks.includes(record.mode+':'+t.id)),count:list.filter(t=>record.checks.includes(record.mode+':'+t.id)).length};}
  function stats(state,now=today()){let active=0,english=0,minutes=0;Object.keys(state.days).filter(d=>d<=now).forEach(d=>{const r=day(state,d),p=progress(r);if(p.minutes)active++;if(p.done)english++;minutes+=p.minutes;});let streak=0,cursor=now;if(!progress(day(state,cursor)).done)cursor=shift(cursor,-1);while(progress(day(state,cursor)).done){streak++;cursor=shift(cursor,-1);}return {active,english,minutes,streak};}
  function apply(state,op,now=today()){
    if(!op||typeof op!=='object')throw Error('无效的修改');
    const next=JSON.parse(JSON.stringify(state));
    if(op.type==='vocabFilter'){if(typeof op.hideBasic!=='boolean')throw Error('无效的词汇筛选');next.hideBasic=op.hideBasic;return next;}
    if(op.type==='vocab'){
      if(typeof op.word!=='string'||! /^[a-z][a-z' -]{0,49}$/.test(op.word)||!['known','again'].includes(op.rating))throw Error('无效的词汇记录');
      next.vocab=next.vocab||{};const old=Object.prototype.hasOwnProperty.call(next.vocab,op.word)?next.vocab[op.word]:undefined;
      if(!old&&Object.keys(next.vocab).length>=15000)throw Error('词汇记录数量达到上限');
      if(op.rating==='known'){
        const streak=old&&old.last===now?Math.max(1,old.streak||0):Math.min(5,(old?.streak||0)+1);
        const interval=[0,1,3,7,14,30][streak];
        next.vocab[op.word]={streak,last:now,next:shift(now,interval),first:old?.first||now,rating:'known'};
      }else next.vocab[op.word]={streak:0,last:now,next:shift(now,1),first:old?.first||now,rating:'again'};
      return next;
    }
    if(!validDate(op.date)||op.date>now)throw Error('只能记录今天或过去的日期');
    if(!next.days[op.date]&&Object.keys(next.days).length>=4000)throw Error('记录数量已达到上限，请先导出备份');
    const r=JSON.parse(JSON.stringify(day(next,op.date)));
    if(op.type==='mode'){if(!['standard','light'].includes(op.mode))throw Error('无效的计划');r.mode=op.mode;}
    else if(op.type==='task'){if(!['standard','light'].includes(op.mode)||!tasks(op.mode).some(t=>t.id===op.id)||typeof op.done!=='boolean')throw Error('无效的任务');const key=op.mode+':'+op.id;r.checks=r.checks.filter(x=>x!==key);if(op.done)r.checks.push(key);}
    else if(op.type==='note'){if(typeof op.note!=='string'||op.note.length>600||typeof op.baseNote!=='string')throw Error('记录最多 600 字');if(r.note!==op.baseNote&&r.note!==op.note){const e=Error('另一台设备更新了这段记录。你的文字已保留，请刷新后核对。');e.code='NOTE_CONFLICT';throw e;}r.note=op.note;}
    else throw Error('不支持的修改');
    next.days[op.date]=r;return next;
  }
  return {STANDARD,LIGHT,today,validDate,shift,weekday,week,empty,day,tasks,progress,stats,apply};
});

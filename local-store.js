(function(root,factory){const api=factory(root.StudyCore||(typeof require==='function'?require('./core.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.PhoneStore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const KEY='little-progress-phone-v1';
  function validate(raw){
    const fail=()=>{throw Error('备份格式不正确，现有记录未被修改。');};
    if(!raw||raw.version!==1||!raw.days||typeof raw.days!=='object'||Array.isArray(raw.days))fail();
    const next=C.empty();
    const entries=Object.entries(raw.days);if(entries.length>4000)fail();
    for(const [date,r] of entries){
      if(!C.validDate(date)||date>C.today()||!r||!['standard','light'].includes(r.mode)||!Array.isArray(r.checks)||r.checks.length>7||typeof r.note!=='string'||r.note.length>600)fail();
      const allowed=['standard:review','standard:listen','standard:speak','standard:write','light:review','light:listen','light:speak'];
      if(r.checks.some(k=>!allowed.includes(k)))fail();
      next.days[date]={mode:r.mode,checks:[...new Set(r.checks)],note:r.note};
    }
    if(raw.hideBasic!==undefined){if(typeof raw.hideBasic!=='boolean')fail();next.hideBasic=raw.hideBasic;}
    if(raw.vocab!==undefined){
      if(!raw.vocab||typeof raw.vocab!=='object'||Array.isArray(raw.vocab)||Object.keys(raw.vocab).length>15000)fail();
      for(const [word,r] of Object.entries(raw.vocab)){
        if(!/^[a-z][a-z' -]{0,49}$/.test(word)||!r||!Number.isInteger(r.streak)||r.streak<0||r.streak>5||!['known','again'].includes(r.rating)||!C.validDate(r.last)||!C.validDate(r.first)||!C.validDate(r.next)||r.first>r.last||r.last>C.today()||r.next<r.last)fail();
        next.vocab[word]={streak:r.streak,last:r.last,first:r.first,next:r.next,rating:r.rating};
      }
    }
    return next;
  }
  function read(storage=globalThis.localStorage){let raw;try{raw=storage.getItem(KEY);}catch{throw Error('浏览器不允许保存记录，请退出无痕模式或检查浏览器设置。');}if(raw===null)return C.empty();try{return validate(JSON.parse(raw));}catch{throw Error('本机记录无法读取，未覆盖原数据。请使用备份恢复。');}}
  function write(state,storage=globalThis.localStorage){const safe=validate(state);try{storage.setItem(KEY,JSON.stringify(safe));}catch{throw Error('保存失败：手机存储空间不足或浏览器禁止存储。请先复制笔记并导出记录。');}}
  return {KEY,read,write,validate};
});

const test = require('node:test');
const assert = require('node:assert/strict');
const {judge,normalizeChart,summarize,POINTS,WINDOWS}=require('../assets/js/rhythm-mini.js');
test('symmetric time judgement windows include exact boundaries',()=>{
 for(const sign of [1,-1]){
  assert.equal(judge(sign*.075),'PERFECT');
  assert.equal(judge(sign*.07501),'GREAT');
  assert.equal(judge(sign*.15),'GREAT');
  assert.equal(judge(sign*.15001),'GOOD');
  assert.equal(judge(sign*.24),'GOOD');
  assert.equal(judge(sign*.24001),'MISS');
 }
 assert.equal(POINTS.PERFECT,100);assert.equal(WINDOWS.GOOD,.24);
});
test('chart rejects invalid lanes/times and events beyond decoded recording',()=>{
 assert.deepEqual(normalizeChart([{t:3,lane:0},{t:1,lane:2},{t:-1,lane:1},{t:NaN,lane:1},{t:2,lane:4},{t:2,lane:1.5},{t:4,lane:0}],3,4),[{t:1,lane:2},{t:3,lane:0}]);
});
test('80% threshold computed from each chart, not a fixed goal or combo',()=>{
 const exactly=summarize({PERFECT:0,GREAT:5,GOOD:0,MISS:0},5,5);
 assert.equal(exactly.score,400);assert.equal(exactly.goal,400);assert.equal(exactly.maximum,500);assert.equal(exactly.passed,true);
 const below=summarize({PERFECT:3,GREAT:0,GOOD:1,MISS:1},5,4);
 assert.equal(below.score,350);assert.equal(below.percentage,70);assert.equal(below.passed,false);
 assert.equal(summarize({PERFECT:58},58,58).goal,4640);
 assert.equal(summarize({},0,0).passed,false);
});
test('all bundled simplified charts fit actual decoded recording and score totals',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const filename of ['practice','concert','guitar','concerto-no1-finale-excerpt']){
  const chart=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/audio/game/'+filename+'.json')));
  assert.equal(chart.scoreTranscription,false);assert.equal(chart.difficulty,'Medium');
  assert.equal(normalizeChart(chart.events,3,chart.decodedDurationSeconds).length,chart.events.length);
  assert.equal(summarize({PERFECT:chart.events.length},chart.events.length,chart.events.length).percentage,100);
 }
});

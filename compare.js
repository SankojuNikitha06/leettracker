/*
  Simple compare script: fetches difficulty buckets for two users and shows side-by-side bar chart.
*/
const COMP_API = window.LEET_PROXY || 'https://leetcode.com/graphql';
const elCmp = id => document.getElementById(id);
document.getElementById('btnCompare').addEventListener('click', compareUsers);

async function getDifficulty(username){
  const query = { query:`query($username:String!){ matchedUser(username:$username){ submitStats:submitStatsGlobal{ acSubmissionNum{ difficulty,count } } } }`, variables:{ username } };
  const res = await fetch(COMP_API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(query) });
  const json = await res.json();
  return json.data?.matchedUser?.submitStats?.acSubmissionNum || null;
}

async function compareUsers(){
  const a = elCmp('userA').value.trim();
  const b = elCmp('userB').value.trim();
  if(!a||!b){ elCmp('error').textContent='Enter both usernames'; return; }
  elCmp('error').textContent='';
  const da = await getDifficulty(a);
  const db = await getDifficulty(b);
  if(!da||!db){ elCmp('error').textContent='Unable to fetch one or both users'; return; }
  // align labels
  const labels = da.map(x=>x.difficulty);
  const ca = da.map(x=>x.count);
  const cb = db.map(x=>x.count);
  elCmp('compareSection').classList.remove('hidden');
  const ctx = elCmp('compareChart').getContext('2d');
  if(window.__compareChart) window.__compareChart.destroy();
  window.__compareChart = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:a, data:ca, backgroundColor:'#42a5f5' },{ label:b, data:cb, backgroundColor:'#66bb6a' }] }, options:{ responsive:true, maintainAspectRatio:false }});
}

/*
  index.js - LeetTracker single-user logic
  - Fetches user profile and submission counts from LeetCode GraphQL.
  - Builds topic chart for selected common DS tags and a simple daily submissions
    chart for last 30 days (consistency).
  - If CORS blocks requests, run the provided proxy (see README).
*/

const API_ENDPOINT = window.LEET_PROXY || 'https://leetcode.com/graphql'; // proxy: http://localhost:4000/graphql
const TOPICS = ['Array','String','Dynamic Programming','Graph','Tree','Hash Table','Two Pointers','Sorting','Stack','Queue'];

// DOM refs
const el = id => document.getElementById(id);
const btn = el('btnFetch');
const usernameInput = el('username');
const errorEl = el('error');
const profileSection = el('profile');
const chartsSection = el('charts');

let topicsChart = null;
let consistencyChart = null;

btn.addEventListener('click', fetchUserData);
usernameInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') fetchUserData(); });

async function fetchUserData(){
  const username = usernameInput.value.trim();
  if(!username){ errorEl.textContent = 'Enter a username'; return; }
  errorEl.textContent = '';

  // GraphQL query: profile + topic breakdown is not officially provided in a single field,
  // so we fetch submission stats (difficulty buckets) and recent submission list then map tags locally.
  const queryProfile = {
    query: `query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          userAvatar
          realName
          aboutMe
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }`,
    variables: { username }
  };

  try{
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(queryProfile)
    });
    const json = await res.json();
    if(!json.data || !json.data.matchedUser){
      errorEl.textContent = 'User not found or blocked by CORS';
      return;
    }

    const user = json.data.matchedUser;
    showProfile(user);
    // difficulty chart from submitStats
    const diffs = (user.submitStats?.acSubmissionNum || []).filter(x=>x.difficulty!=='All');
    renderDifficultyChart(diffs);

    // For topic-wise counts and daily activity we need recent submissions.
    // We'll fetch user recent submissions (last 1000) and compute tag counts and daily totals.
    await fetchSubmissionsAndRender(username);
  }catch(err){
    console.error(err);
    errorEl.textContent = 'Network or CORS error — see README for proxy.';
  }
}

function showProfile(user){
  profileSection.classList.remove('hidden');
  el('profileName').textContent = user.profile?.realName || user.username;
  el('profileInfo').innerHTML = `<table class="infotable">
    <tr><td>Username</td><td>${user.username}</td></tr>
    </table>`;
  el('profileAvatar').src = user.profile?.userAvatar || '';
  chartsSection.classList.remove('hidden');
}

async function fetchSubmissionsAndRender(username){
  // GraphQL to fetch user submission list - LeetCode returns paginated submissionRecords via "submissionList" on some endpoints.
  // We'll use https://leetcode.com/api/submissions (legacy) which returns recent submissions; fallback to GraphQL if needed.
  try{
    // Try legacy API first (no GraphQL): https://leetcode.com/api/submissions/?offset=0&limit=200
    const url = `/api/submissions/?offset=0&limit=500&username=${encodeURIComponent(username)}`;
    const base = window.LEET_PROXY ? window.LEET_PROXY.replace('/graphql','') : 'https://leetcode.com';
    const res = await fetch(base + url, {headers:{'Content-Type':'application/json'}});
    if(!res.ok) throw new Error('legacy submissions fetch failed');
    const data = await res.json();
    const submissions = data.submissions_dump || data.submissions || [];
    // compute tag counts and daily counts
    const tagCounts = {};
    const daily = {}; // yyyy-mm-dd -> count

    submissions.forEach(s=>{
      const date = new Date(s.timestamp * 1000);
      const day = date.toISOString().slice(0,10);
      daily[day] = (daily[day] || 0) + 1;
      // problem tags may be in s.tags or s.question__title_slug - fallback: we call problem detail not to heavy here
      const tags = s.tags || (s.stat ? (s.stat.question__title_slug ? []:[]) : []);
      // can't rely on tags in legacy dump; ignore if missing
      if(Array.isArray(tags)){
        tags.forEach(t=> tagCounts[t] = (tagCounts[t]||0)+ (s.status==='AC'?1:0));
      }
    });

    // map tagCounts to our TOPICS (simple contains match)
    const topicCounts = TOPICS.map(topic=>{
      let count=0;
      Object.keys(tagCounts).forEach(t=>{
        if(t.toLowerCase().includes(topic.toLowerCase())) count += tagCounts[t];
      });
      return count;
    });

    renderTopicChart(TOPICS, topicCounts);
    renderConsistencyChartFromDaily(daily);
  }catch(err){
    console.warn('Legacy API failed, trying GraphQL submissions', err);
    await fetchSubmissionsViaGraphQL(username);
  }
}

async function fetchSubmissionsViaGraphQL(username){
  // GraphQL to fetch recent submissionRecords via "recentAcceptedQuestions" or "all" is not public.
  // We'll request user's recent submissions using a common community query (may be rate-limited).
  const query = {
    query: `query recentSubmissions($username:String!){
      recentAcSubmissions(username:$username){
        title
        titleSlug
        timestamp
        tags
      }
    }`,
    variables: { username }
  };
  try{
    const res = await fetch(API_ENDPOINT, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(query)
    });
    const json = await res.json();
    const subs = json.data?.recentAcSubmissions || [];
    const daily = {};
    const tagCounts = {};
    subs.forEach(s=>{
      const day = new Date(s.timestamp*1000).toISOString().slice(0,10);
      daily[day] = (daily[day]||0)+1;
      (s.tags||[]).forEach(t=> tagCounts[t] = (tagCounts[t]||0)+1);
    });
    const topicCounts = TOPICS.map(topic=>{
      let count=0;
      Object.keys(tagCounts).forEach(t=>{
        if(t.toLowerCase().includes(topic.toLowerCase())) count += tagCounts[t];
      });
      return count;
    });
    renderTopicChart(TOPICS, topicCounts);
    renderConsistencyChartFromDaily(daily);
  }catch(err){
    console.error('GraphQL submissions failed', err);
    errorEl.textContent = 'Unable to fetch submissions for topic/consistency. Try running the proxy.';
  }
}

function renderDifficultyChart(diffs){
  // simple difficulty bar (Easy/Medium/Hard)
  const labels = diffs.map(d=>d.difficulty);
  const data = diffs.map(d=>d.count);
  if(topicsChart) topicsChart.destroy();
  const ctx = document.getElementById('topicsChart').getContext('2d');
  topicsChart = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Solved by difficulty', data, backgroundColor:['#4caf50','#ffb74d','#f44336'] }] }, options:{ responsive:true, maintainAspectRatio:false }});
}

function renderTopicChart(labels, data){
  // replaces difficulty chart with topic chart
  if(topicsChart) topicsChart.destroy();
  const ctx = document.getElementById('topicsChart').getContext('2d');
  topicsChart = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Solved problems (mapped to topics)', data, backgroundColor:'#42a5f5' }] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true }}}});
}

function renderConsistencyChartFromDaily(daily){
  // daily is map yyyy-mm-dd -> count. build last 30 days array
  const days = [];
  const counts = [];
  const now = new Date();
  for(let i=29;i>=0;i--){
    const d = new Date(now); d.setDate(now.getDate()-i);
    const key = d.toISOString().slice(0,10);
    days.push(key);
    counts.push(daily[key]||0);
  }
  if(consistencyChart) consistencyChart.destroy();
  const ctx = document.getElementById('consistencyChart').getContext('2d');
  consistencyChart = new Chart(ctx, { type:'line', data:{ labels:days, datasets:[{ label:'Submissions per day (last 30 days)', data:counts, fill:true, tension:0.3 }] }, options:{ responsive:true, maintainAspectRatio:false }});
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iybefhhtydzfvswprdlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5YmVmaGhodHlkemZ2c3dwcmRsYyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI2MDkzMDQ5LCJleHAiOjIwNDE2NjkwNDl9.aP-s9XZ4c8Yh-oMj0iZQRO1QePqyeX6WBBuPdL4MJPM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDiscovery() {
  console.log('🔍 Checking Discovery vs DM Connected Data...\n');
  
  // Query 1: Discovery stage deals
  const { data: discovery, error: e1, count: discCount } = await supabase
    .from('deals')
    .select('id, name, stage, amount', { count: 'exact' })
    .eq('stage', 'discovery')
    .limit(10);
  
  console.log(`📊 Discovery Stage: ${discCount || 0} deals`);
  if (discovery && discovery.length > 0) {
    discovery.forEach(d => console.log(`   - ${d.name} ($${d.amount || 0})`));
  }
  
  // Query 2: DM Connected stage deals
  const { data: dm, error: e2, count: dmCount } = await supabase
    .from('deals')
    .select('id, name, stage, amount', { count: 'exact' })
    .eq('stage', 'dm connected')
    .limit(10);
  
  console.log(`\n📞 DM Connected Stage: ${dmCount || 0} deals`);
  if (dm && dm.length > 0) {
    dm.forEach(d => console.log(`   - ${d.name} ($${d.amount || 0})`));
  }
  
  // Query 3: Check all stage counts
  const { data: allDeals } = await supabase
    .from('deals')
    .select('stage');
  
  const stageCounts = {};
  allDeals?.forEach(d => {
    stageCounts[d.stage] = (stageCounts[d.stage] || 0) + 1;
  });
  
  console.log(`\n📈 All Stages:`);
  Object.entries(stageCounts).sort((a, b) => b[1] - a[1]).forEach(([stage, count]) => {
    console.log(`   ${stage}: ${count}`);
  });
}

checkDiscovery().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

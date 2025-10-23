async function loadData() {
  try {
    const res = await fetch('/logs');
    const data = await res.json();
    renderTable(data);
    renderStats(data);
  } catch (err) {
    console.error('Eroare la citirea datelor:', err);
  }
}

function renderTable(data) {
  const tbody = document.querySelector('#visitsTable tbody');
  tbody.innerHTML = '';
  data.forEach(v => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(v.timestamp).toLocaleString()}</td>
      <td>${v.path}</td>
      <td>${v.referrer || '-'}</td>
      <td>${v.language}</td>
      <td>${v.screen.width}×${v.screen.height}</td>
      <td>${v.userAgent.split(' ')[0]}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderStats(data) {
  const total = data.length;
  const langs = {};
  data.forEach(v => langs[v.language] = (langs[v.language] || 0) + 1);
  const topLang = Object.entries(langs).sort((a,b)=>b[1]-a[1])[0];

  const statsDiv = document.getElementById('stats');
  statsDiv.innerHTML = `
    <b>Total vizite:</b> ${total}<br>
    <b>Cea mai folosită limbă:</b> ${topLang ? topLang[0] : 'n/a'}
  `;
}

loadData();

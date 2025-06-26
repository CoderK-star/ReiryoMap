// Fetch data from Google Sheets using the public API
const apiKey = 'AIzaSyAUi4KazffmDZV_dQUnMUKA1jJt4i0mqlU';
const spreadsheetId = '19LosVkt3flvZfcL15k_DBLLrjOwiHWu9rYVE8ri7NQY';
const sheetName = 'map';
var dataObject = [];
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;

fetch(url)
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        const headers = data.values ? data.values[0] : [];
        const rows = data.values ? data.values.slice(1) : [];
        console.log('Headers:', headers);
        console.log('Rows:', rows);
        dataObject = rows.map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i];
            });
            return obj;
        });
        console.log('Data Object:', dataObject);
        initmap(rows, headers);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
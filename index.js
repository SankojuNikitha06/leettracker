
async function getData() {
    let username = document.getElementById('handle').value.trim();
    let errorElem = document.getElementById('error');
    let hiddenDiv = document.getElementById('hiddendiv');
    errorElem.textContent = "";
    hiddenDiv.style.display = "none";

    if (!username) {
        errorElem.textContent = "Please enter a username";
        return;
    }

    try {
        let response = await fetch(`https://leetcode-stats-api.herokuapp.com/${username}`);
        if (!response.ok) throw new Error("User not found or API error");

        let data = await response.json();
        if (data.status === "error") throw new Error(data.message || "Error fetching data");

        // Populate User Profile table (contest rating removed)
        document.getElementById('userTable').innerHTML = `
            <tr><td>Username</td><td>${username}</td></tr>
            <tr><td>Ranking</td><td>${data.ranking ?? "N/A"}</td></tr>
            <tr><td>Total Solved</td><td>${data.totalSolved}</td></tr>
            <tr><td>Acceptance Rate</td><td>${data.acceptanceRate}%</td></tr>
        `;

        // Problem stats
        document.getElementById('problemTable').innerHTML = `
            <tr><td>Easy</td><td>${data.easySolved} / ${data.totalEasy}</td></tr>
            <tr><td>Medium</td><td>${data.mediumSolved} / ${data.totalMedium}</td></tr>
            <tr><td>Hard</td><td>${data.hardSolved} / ${data.totalHard}</td></tr>
        `;

        // Pie chart % text
        let easyPercent = ((data.easySolved / data.totalEasy) * 100).toFixed(1);
        let medPercent = ((data.mediumSolved / data.totalMedium) * 100).toFixed(1);
        let hardPercent = ((data.hardSolved / data.totalHard) * 100).toFixed(1);

        document.getElementById("pieSummary").innerHTML =
            `Easy: ${easyPercent}%, Medium: ${medPercent}%, Hard: ${hardPercent}%`;

        // Pie Chart
        new Chart(document.getElementById('pieChart'), {
            type: 'pie',
            data: {
                labels: ['Easy', 'Medium', 'Hard'],
                datasets: [{
                    data: [data.easySolved, data.mediumSolved, data.hardSolved],
                    backgroundColor: ['#4caf50', '#ff9800', '#f44336']
                }]
            }
        });

        hiddenDiv.style.display = "block";
    } catch (err) {
        errorElem.textContent = err.message;
    }
}

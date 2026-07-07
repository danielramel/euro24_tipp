var tableContainer;
document.addEventListener('DOMContentLoaded', () => {
    tableContainer = document.getElementById('table-container');
    rows = Array.from(tableContainer.getElementsByTagName("tr"));
    
    tableContainer.querySelectorAll(".col3")
    .forEach( th => th.addEventListener('mouseleave', () => {
        b = th.getElementsByTagName("button")[0];
        if (b)
            b.blur();
    })
    );

    rows = Array.from(tableContainer.getElementsByTagName("tr"));
});

function scrollToDiv(str) {
    if (str === 'user')
        document.getElementById('user').scrollIntoView({ behavior: 'smooth' });
    else if (str === 'top')
        tableContainer.scrollTo({top: 0, behavior: 'smooth'});
    else 
        tableContainer.scrollTo({top: tableContainer.scrollHeight, behavior: 'smooth'});
}

var didTippekLoaded = false;
var rows;
var addedNodes = [];

async function loadTippekJson() {
    try {
        const response = await fetch("tippek");
        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }    
        const responseData = await response.json();
        createTableCells(responseData);
    } catch (error) {
        console.error(error);
        displayMsg("Valami hiba történt!","error");
        return;
    }
}

function createTableCells(responseData) {
    var matches = responseData.matches;
    const thTemplate = document.getElementById("eredmeny-template");
    var addedRow = [];
    matchIdsInOrder = [];
    
    // meccsek sor (table fejléc)
    matches.forEach(m => {
        const clone = thTemplate.content.children[0].cloneNode(true);
        clone.addEventListener("animationend", () => {
            clone.style.scale = "1"; clone.classList.remove("animation-visible");
        } );
        clone.getElementsByClassName("__kep-link")[0].src = m.kep_H;
        clone.getElementsByClassName("__kep-link")[1].src = m.kep_A;
        clone.getElementsByClassName("__eredmeny-str")[0].textContent = 
            [m.goals_H, m.goals_A].some(el => el === null)?
            "-":
            m.goals_H + " - " + m.goals_A;
        clone.dataset.mid = m.id;
        matchIdsInOrder.push(m.id);
        addedRow.push(clone);
        rows[0].appendChild(clone);
    });
    addedNodes.push(addedRow);
    
    // tippek beírása
    const tdTemplate = document.getElementById("td-template");
    function addBetNode(scoreStr, points, toRow) {
        const clone = tdTemplate.content.cloneNode(true);
        const spanClone = clone.querySelector("span");
        spanClone.textContent = scoreStr;
        const tdElement = clone.querySelector("td");
        const pointValue = Number(points);
        if (Number.isFinite(pointValue))
            tdElement.dataset.points = pointValue;
        else
            tdElement.removeAttribute("data-points");
        tdElement.addEventListener("animationend", () => {
            tdElement.style.scale = "1"; 
            tdElement.classList.remove("animation-visible");
        });
        addedRow.push(tdElement);
        toRow.appendChild(tdElement);
    }

    allBets = responseData.all_bets;
    matchesHeader = addedNodes[0];
    rows.slice(1).forEach( row => {
        addedRow = [];
        userId = row.getElementsByClassName("col3")[0].dataset.uid;
        betsOfUser = allBets[userId];
        
        matchIdsInOrder.forEach( mId => {
            if (betsOfUser && mId in betsOfUser) {
                const bet = betsOfUser[mId];
                addBetNode(bet.bet_H + " - " + bet.bet_A, bet.points, row);
            }
            else {
                addBetNode("-", 0, row);
            }
        });
        addedNodes.push(addedRow);
    });
    didTippekLoaded = true;
}

function isVisibleCell(el) {
    if (el.style.display === "none")
        return false;
    const rect = el.getBoundingClientRect();
    const containerRect = tableContainer.getBoundingClientRect();
    return (
        rect.bottom >= containerRect.top &&
        rect.right >= containerRect.left &&
        rect.top <= containerRect.bottom &&
        rect.left <= containerRect.right
    );
}

function updateDelayTimes(forFadeIn, defaultDelay = 0) {
    defaultDelay = defaultDelay/1000;
    if ( addedNodes[0] === undefined )
        return;

    var containerRect = tableContainer.getBoundingClientRect();
    var centerX = Math.round(window.innerWidth/2);
    var centerY = Math.round(containerRect.top + containerRect.height/2);
    var notVisibleCells = [];

    if (forFadeIn) {
        addedNodes[0].forEach( e => {
                if ( isVisibleCell(e) ) {
                    var xCoord = e.getBoundingClientRect().left;
                    e.style.setProperty("--transition-delay",
                        (defaultDelay + xCoord*xCoord/3500000)+"s");
                    e.classList.add("animation-visible");
                }
                else 
                    e.style.scale = "1";
        });
    }
    addedNodes.slice(1).forEach( row => {
        if (isVisibleCell(row[0].parentNode)) {
            row.forEach( e => {
                if (isVisibleCell(e)) {
                    var xCoord = e.getBoundingClientRect().left;
                    var yCoord = e.getBoundingClientRect().top;
                    var delay1 = xCoord*xCoord + 20*(yCoord-centerY)*(yCoord-centerY);
                    var delay2 = (xCoord-centerX)*(xCoord-centerX) +
                                2*(yCoord-centerY)*(yCoord-centerY);
                    var delay = forFadeIn? (delay1/3500000 + .8) : (delay2/400000);
                    e.style.setProperty("--transition-delay",
                        (defaultDelay + delay)+"s");
                    e.classList.add("animation-visible");
                }
                else
                    notVisibleCells.push(e);
            });
        }
        else
            notVisibleCells = notVisibleCells.concat(row);
    });
    notVisibleCells.forEach( e => {
        e.classList.remove("animation-visible");
        e.style.scale = "1";
    });
}


async function showTippek(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget;
    var doShow = target.hasAttribute("data-doShow");
    target.toggleAttribute("data-doShow");

    if (!didTippekLoaded)
        await loadTippekJson();

    var mainEl = document.getElementById("main-table");
    var left = tableContainer.getBoundingClientRect().left;

    addedNodes.forEach(row => {
        row.forEach(cell => {
            cell.style.display = doShow? "" : "none";
            cell.style.scale = "0";
            });
    });

    if (doShow)
        updateDelayTimes(true, 150);

    var newLeft = tableContainer.getBoundingClientRect().left;
    const slide = [
        { transform: "translateX(" + (left-newLeft) + "px)" },
        { transform: "translateX(0)"},
    ];
    mainEl.animate(slide, {duration: 100,easing: "ease-in-out"});
    toggleTippekButtons(doShow);    
    document.getElementById("point-indicators-table").classList.toggle("visible", doShow);
}

function toggleTippekButtons(tippekVisible) {
    const toggleButton = document.getElementById("show-tippek-gomb");
    toggleButton.classList.toggle("checked", tippekVisible);
    toggleButton.getElementsByClassName("info")[0].textContent =
        tippekVisible ? "Tippek elrejtése" : "Tippek megjelenítése";
}

var onlyFollowedVisible = false;
function toggleNotFollowed() {
    onlyFollowedVisible = !onlyFollowedVisible;

    tableContainer.querySelectorAll("tbody .col3:not([data-followed])").forEach( thElement => {
        var rowElement = thElement.parentElement;
        rowElement.style.display = onlyFollowedVisible ? "none" : "";
    });

    var place = 1;
    Array.from(tableContainer.getElementsByTagName("tbody")).forEach( tbodyElement => {
        if ( tbodyElement.getBoundingClientRect().height === 0 )
            return;

        var numRows = Array.from(tbodyElement.children)
            .filter(e => e.style.display === "").length; 
    
        Array.from(tbodyElement.children).forEach( rowElement => {                
            rowElement.children[0].style.display = "none";
            rowElement.children[1].style.display = "none";
        });
        var firstRowElement = Array.from(tbodyElement.children).find( e => {
            return e.style.display === "";
        });
        firstRowElement.children[0].rowSpan = numRows;
        firstRowElement.children[0].textContent = place+'.';
        firstRowElement.children[1].rowSpan = numRows;
        firstRowElement.children[0].style.display = "";
        firstRowElement.children[1].style.display = "";
        place += numRows;
    });

    toggleFollowsButtons();
}

function toggleFollowsButtons() {
    const toggleButton = document.getElementById("toggle-follows-gomb");
    toggleButton.classList.toggle("checked", onlyFollowedVisible);
    toggleButton.getElementsByClassName("info")[0].textContent =
        onlyFollowedVisible ? "Mindenki megjelenítése" : "Csak követettek megjelenítése";
}

function showFollowButton(ev) {
    var button = ev.currentTarget.getElementsByTagName("button")[0];
    button.focus();
}

async function follow(ev) {
    ev.stopPropagation();
    var button = ev.currentTarget;
    var parent = button.parentElement;

    const data = {
        uid: parent.dataset.uid,
        action: parent.hasAttribute("data-followed") ?
            "unfollow" : "follow"
    };

    try {
        const fetchData = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify(data)
        };
        const response = await fetch(document.URL, fetchData);

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }

        const responseData = await response.json();
        var responseMsg = responseData.response;
        if (responseMsg != "")
            displayMsg(responseMsg,"error");
        else {
            parent.toggleAttribute("data-followed");
        }
	} catch (error) {
		console.error(error);
	}
}

let isDownOnTable = false;
let startX;
let startY;
let scrollLeft;
let scrollTop;
let shrinkCol3;
let shrinkCol3Limit = 250;

function tableScrollMouseDown(e) {
    e.stopPropagation();
    isDownOnTable = true;
    startX = e.pageX - tableContainer.offsetLeft;
    startY = e.pageY - tableContainer.offsetTop;
    scrollLeft = tableContainer.scrollLeft;
    scrollTop = tableContainer.scrollTop;
    document.body.style.cursor = "url('https://maps.gstatic.com/mapfiles/closedhand_8_8.cur'), grab";
}
document.addEventListener('mouseup', (e) => {
    if (isDownOnTable) {
        isDownOnTable = false;
        document.body.style.cursor = "auto";
        
        const x = e.pageX - tableContainer.offsetLeft;
        const walkX = (x - startX);
        const y = e.pageY - tableContainer.offsetTop;
        const walkY = (y - startY);
        Array.from(document.body.children)
            .forEach(elem => { elem.style.pointerEvents = "auto"; });
    }
});
document.addEventListener('mousemove', (e) => {
    if(isDownOnTable) {
        const x = e.pageX - tableContainer.offsetLeft;
        const walkX = (x - startX);
        const y = e.pageY - tableContainer.offsetTop;
        const walkY = (y - startY);
        tableContainer.scrollLeft = scrollLeft - walkX;
        tableContainer.scrollTop = scrollTop - walkY;
        if (Math.abs(walkX) + Math.abs(walkY) > 10) {
            Array.from(document.body.children)
                .forEach(elem => { elem.style.pointerEvents = "none"; });
        }
    }
});

var currentMatchInfoElement;
var currentChartInstance;

async function loadMatchData(m_id) {
    try {        
        const response = await fetch("meccsinfo/"+m_id);
        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }
        const responseData = await response.json();
        if (responseData["valid"])
            showMatchData(responseData);

    } catch (error) {
        console.error(error);
        displayMsg("Valami hiba történt!","error");
        return;
    }
}

function showMatchData(response) {
    if (currentMatchInfoElement != null)
        return;
    const matchInfo = response["matchInfo"];
    const infoTemplate = document.getElementById("meccs-info-template");
    currentMatchInfoElement = infoTemplate.content.children[0].cloneNode(true);
    
    var updatedElement = currentMatchInfoElement.getElementsByTagName("time")[0];
    updatedElement.dateTime = matchInfo.start_date;
    updatedElement.textContent = dateToString(new Date(matchInfo.start_date));

    updatedElement = currentMatchInfoElement.getElementsByTagName("img");
    updatedElement[0].src = matchInfo.kep_H;
    updatedElement[1].src = matchInfo.kep_A;

    updatedElement = currentMatchInfoElement.getElementsByClassName("goals");
    updatedElement[0].textContent = matchInfo.goals_H;
    updatedElement[1].textContent = matchInfo.goals_A;

    updatedElement = currentMatchInfoElement.getElementsByClassName("csapat-nev");
    updatedElement[0].textContent = matchInfo.team_H;
    updatedElement[1].textContent = matchInfo.team_A;

    updatedElement = currentMatchInfoElement.querySelectorAll(".odds span");
    updatedElement[0].style = "--grow: " + matchInfo.odds_H;
    updatedElement[1].style = "--grow: " + matchInfo.odds_X;
    updatedElement[2].style = "--grow: " + matchInfo.odds_A;
    updatedElement[0].textContent = matchInfo.odds_H;
    updatedElement[1].textContent = matchInfo.odds_X;
    updatedElement[2].textContent = matchInfo.odds_A;

    currentMatchInfoElement.querySelectorAll(".max-pont span")[1].textContent = response["maxPoint"];

    updatedElement = currentMatchInfoElement.querySelectorAll(".avg-tipp span");
    updatedElement[0].style = "--grow: " + (response["avgBets"][0]+0.3);
    updatedElement[1].style = "--grow: " + (response["avgBets"][1]+0.3);
    updatedElement[0].textContent = response["avgBets"][0];
    updatedElement[1].textContent = response["avgBets"][1];

    document.body.appendChild(currentMatchInfoElement);
    drawChart(currentMatchInfoElement.getElementsByTagName("canvas"),
        response["pointDistribution"],
        response["maxPoint"]);
}

function drawChart(canvas, pointDistribution, maxPoint) {
    var labels = [];
    var data = [];
    for (let i=0; i<=maxPoint; ++i) {
        labels.push(i);
        data.push(pointDistribution[i]);
    }
    currentChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'db tipp',
          data: data,
          borderWidth: 1
        }]
      },
      options: {
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'pont'
                },
                ticks: {                    
                    autoskip: false,
                }
            },
            y: {
                title: {
                    display: false,
                    text: 'db tipp'
                },
                ticks: {
                    beginAtZero: true,
                    autoskip: false,
                },
                type: 'logarithmic',
            }
        }
      }
    });
}

function toggleScaleMode(node) {
    if (node.classList.contains('active'))
        return;

    type = currentChartInstance.options.scales.y.type;
    currentChartInstance.options.scales.y.type = 
        type === 'logarithmic'? 'linear' : 'logarithmic';
    currentChartInstance.update();
    node.parentElement.children[0].classList.toggle('active');
    node.parentElement.children[1].classList.toggle('active');
}

function closeMatchInfo() {
    if (currentMatchInfoElement == null)
        return;
    currentMatchInfoElement.remove();
    currentMatchInfoElement = null;
    currentChartInstance.destroy();
}
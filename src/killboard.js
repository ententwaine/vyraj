// Constants
const ALLIANCE_ID = 99013846;
const ZKILL_API = `https://zkillboard.com/api/allianceID/${ALLIANCE_ID}/`;
const ESI_BASE = 'https://esi.evetech.net/latest';
const KILLS_TO_FETCH = 15;

// Elements
const killboardTable = document.getElementById('killboard-table');
const killboardBody = document.getElementById('killboard-body');
const killboardLoading = document.getElementById('killboard-loading');

// Helpers
const formatISK = (value) => {
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'b';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'm';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'k';
    return value.toFixed(2);
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').substring(0, 16);
};

// Main function
async function initKillboard() {
    try {
        // 1. Fetch from zKillboard
        const zkillRes = await fetch(ZKILL_API);
        if (!zkillRes.ok) throw new Error('Failed to fetch from zKillboard');
        const zkillData = await zkillRes.json();
        
        // Take latest kills
        const recentKills = zkillData.slice(0, KILLS_TO_FETCH);
        
        // 2. Fetch full killmail data from ESI
        const killmailPromises = recentKills.map(kill => 
            fetch(`${ESI_BASE}/killmails/${kill.killmail_id}/${kill.zkb.hash}/`)
                .then(res => res.json())
                .then(data => ({...data, zkb: kill.zkb}))
        );
        
        const killmails = await Promise.all(killmailPromises);
        
        // 3. Extract unique IDs to resolve names
        const uniqueIds = new Set();
        killmails.forEach(km => {
            uniqueIds.add(km.solar_system_id);
            if (km.victim) {
                if (km.victim.character_id) uniqueIds.add(km.victim.character_id);
                if (km.victim.corporation_id) uniqueIds.add(km.victim.corporation_id);
                if (km.victim.ship_type_id) uniqueIds.add(km.victim.ship_type_id);
            }
            if (km.attackers) {
                km.attackers.forEach(attacker => {
                    if (attacker.final_blow) {
                        if (attacker.character_id) uniqueIds.add(attacker.character_id);
                        if (attacker.ship_type_id) uniqueIds.add(attacker.ship_type_id);
                        if (attacker.corporation_id) uniqueIds.add(attacker.corporation_id);
                    }
                });
            }
        });
        
        // 4. Resolve names via ESI
        const idsArray = Array.from(uniqueIds);
        const nameRes = await fetch(`${ESI_BASE}/universe/names/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(idsArray)
        });
        const namesData = await nameRes.json();
        
        // Create lookup map
        const nameMap = {};
        namesData.forEach(item => {
            nameMap[item.id] = item;
        });
        
        // 5. Render
        killboardBody.innerHTML = '';
        
        killmails.forEach(km => {
            // Check if Vyraj is victim or attacker to style the row
            const isLoss = km.victim.alliance_id === ALLIANCE_ID;
            
            const victimName = km.victim.character_id ? nameMap[km.victim.character_id]?.name : (nameMap[km.victim.corporation_id]?.name || 'Unknown');
            const shipName = nameMap[km.victim.ship_type_id]?.name || 'Unknown Ship';
            const shipIcon = `https://images.evetech.net/types/${km.victim.ship_type_id}/icon?size=64`;
            const systemName = nameMap[km.solar_system_id]?.name || 'Unknown';
            
            let finalBlowAttacker = km.attackers.find(a => a.final_blow);
            const fbName = finalBlowAttacker && finalBlowAttacker.character_id ? nameMap[finalBlowAttacker.character_id]?.name : (nameMap[finalBlowAttacker?.corporation_id]?.name || 'Unknown');
            
            const tr = document.createElement('tr');
            tr.className = `kill-row ${isLoss ? 'kill-loss' : 'kill-win'}`;
            // Redirect to detail page on click
            tr.onclick = () => {
                window.location.href = `/kill.html?id=${km.killmail_id}&hash=${km.zkb.hash}`;
            };
            
            tr.innerHTML = `
                <td class="km-time">${formatDate(km.killmail_time)}</td>
                <td class="km-ship">
                    <img src="${shipIcon}" alt="${shipName}" class="ship-icon" title="${shipName}">
                </td>
                <td class="km-victim">
                    <div class="pilot-name">${victimName}</div>
                    <div class="ship-name">${shipName}</div>
                </td>
                <td class="km-attacker">${fbName}</td>
                <td class="km-system">${systemName}</td>
                <td class="km-isk ${isLoss ? 'isk-loss' : 'isk-win'}">${formatISK(km.zkb.totalValue)}</td>
            `;
            
            killboardBody.appendChild(tr);
        });
        
        // Hide loading, show table
        killboardLoading.classList.add('hidden');
        killboardTable.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading killboard:', error);
        killboardLoading.innerHTML = `<p class="highlight-red">ERROR: CONNECTION LOST TO CONCORD DATABASES</p>`;
    }
}

document.addEventListener('DOMContentLoaded', initKillboard);

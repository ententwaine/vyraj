const ESI_BASE = 'https://esi.evetech.net/latest';

const killLoading = document.getElementById('kill-loading');
const killDetailsContainer = document.getElementById('kill-details-container');
const victimInfo = document.getElementById('victim-info');
const statsInfo = document.getElementById('stats-info');
const attackersList = document.getElementById('attackers-list');
const attackerCountSpan = document.getElementById('attacker-count');

const formatISK = (value) => {
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'b';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'm';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'k';
    return value ? value.toFixed(2) : '0';
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').substring(0, 16);
};

async function initKillDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const killId = urlParams.get('id');
        const killHash = urlParams.get('hash');
        
        if (!killId || !killHash) {
            throw new Error('Missing kill ID or Hash');
        }
        
        // 1. Fetch from ESI
        const killRes = await fetch(`${ESI_BASE}/killmails/${killId}/${killHash}/`);
        if (!killRes.ok) throw new Error('Failed to fetch from ESI');
        const km = await killRes.json();
        
        // 2. Fetch from zKill to get ISK values
        let zkbData = { totalValue: 0, points: 0 };
        try {
            const zkillRes = await fetch(`https://zkillboard.com/api/killID/${killId}/`);
            const zkillArray = await zkillRes.json();
            if (zkillArray && zkillArray.length > 0) {
                zkbData = zkillArray[0].zkb;
            }
        } catch (e) {
            console.warn("Could not fetch zkill stats for this kill");
        }
        
        // 3. Extract unique IDs
        const uniqueIds = new Set();
        uniqueIds.add(km.solar_system_id);
        
        if (km.victim) {
            if (km.victim.character_id) uniqueIds.add(km.victim.character_id);
            if (km.victim.corporation_id) uniqueIds.add(km.victim.corporation_id);
            if (km.victim.alliance_id) uniqueIds.add(km.victim.alliance_id);
            if (km.victim.ship_type_id) uniqueIds.add(km.victim.ship_type_id);
        }
        
        if (km.attackers) {
            km.attackers.forEach(attacker => {
                if (attacker.character_id) uniqueIds.add(attacker.character_id);
                if (attacker.corporation_id) uniqueIds.add(attacker.corporation_id);
                if (attacker.alliance_id) uniqueIds.add(attacker.alliance_id);
                if (attacker.ship_type_id) uniqueIds.add(attacker.ship_type_id);
                if (attacker.weapon_type_id) uniqueIds.add(attacker.weapon_type_id);
            });
        }
        
        // 4. Resolve names
        const idsArray = Array.from(uniqueIds);
        const nameRes = await fetch(`${ESI_BASE}/universe/names/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(idsArray)
        });
        const namesData = await nameRes.json();
        const nameMap = {};
        namesData.forEach(item => { nameMap[item.id] = item; });
        
        // 5. Render Victim
        const victimName = km.victim.character_id ? nameMap[km.victim.character_id]?.name : (nameMap[km.victim.corporation_id]?.name || 'Unknown');
        const victimCorp = km.victim.corporation_id ? nameMap[km.victim.corporation_id]?.name : '';
        const victimAlliance = km.victim.alliance_id ? nameMap[km.victim.alliance_id]?.name : '';
        const shipName = nameMap[km.victim.ship_type_id]?.name || 'Unknown Ship';
        
        const charImg = km.victim.character_id ? `https://images.evetech.net/characters/${km.victim.character_id}/portrait?size=128` : `https://images.evetech.net/corporations/${km.victim.corporation_id}/logo?size=128`;
        const shipImg = `https://images.evetech.net/types/${km.victim.ship_type_id}/render?size=256`;
        
        victimInfo.innerHTML = `
            <div class="victim-profile">
                <img src="${charImg}" alt="Pilot" class="pilot-portrait">
                <div class="pilot-details">
                    <h3>${victimName}</h3>
                    <p class="corp-name">${victimCorp}</p>
                    <p class="alliance-name">${victimAlliance}</p>
                </div>
            </div>
            <div class="victim-ship">
                <img src="${shipImg}" alt="${shipName}" class="ship-render">
                <h4>${shipName}</h4>
            </div>
        `;
        
        // 6. Render Stats
        const systemName = nameMap[km.solar_system_id]?.name || 'Unknown';
        statsInfo.innerHTML = `
            <div class="stat-row">
                <span class="stat-label">TIME</span>
                <span class="stat-value">${formatDate(km.killmail_time)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">SYSTEM</span>
                <span class="stat-value">${systemName}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">DAMAGE TAKEN</span>
                <span class="stat-value highlight-red">${km.victim.damage_taken.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">ISK DESTROYED</span>
                <span class="stat-value">${formatISK(zkbData.totalValue)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">POINTS</span>
                <span class="stat-value">${zkbData.points}</span>
            </div>
        `;
        
        // 7. Render Attackers
        attackerCountSpan.innerText = km.attackers.length;
        
        // Sort attackers by damage
        km.attackers.sort((a, b) => b.damage_done - a.damage_done);
        
        let attackersHtml = '';
        km.attackers.forEach(attacker => {
            const aName = attacker.character_id ? nameMap[attacker.character_id]?.name : (nameMap[attacker.corporation_id]?.name || 'Unknown');
            const aCorp = attacker.corporation_id ? nameMap[attacker.corporation_id]?.name : '';
            const aShip = nameMap[attacker.ship_type_id]?.name || 'Unknown Ship';
            const aWeapon = nameMap[attacker.weapon_type_id]?.name || 'Unknown Weapon';
            const aShipIcon = `https://images.evetech.net/types/${attacker.ship_type_id}/icon?size=64`;
            const aCharImg = attacker.character_id ? `https://images.evetech.net/characters/${attacker.character_id}/portrait?size=64` : `https://images.evetech.net/corporations/${attacker.corporation_id}/logo?size=64`;
            
            const isFb = attacker.final_blow ? '<span class="fb-badge">FINAL BLOW</span>' : '';
            
            attackersHtml += `
                <div class="attacker-row ${attacker.final_blow ? 'final-blow-row' : ''}">
                    <img src="${aCharImg}" alt="Pilot" class="attacker-portrait">
                    <div class="attacker-info">
                        <div class="attacker-name-row">
                            <span class="attacker-name">${aName}</span> ${isFb}
                        </div>
                        <div class="attacker-corp">${aCorp}</div>
                    </div>
                    <div class="attacker-ship-info">
                        <img src="${aShipIcon}" alt="Ship" class="attacker-ship-icon">
                        <div class="attacker-ship-details">
                            <span class="a-ship">${aShip}</span>
                            <span class="a-weapon">${aWeapon}</span>
                        </div>
                    </div>
                    <div class="attacker-damage">
                        ${attacker.damage_done.toLocaleString()} DMG
                    </div>
                </div>
            `;
        });
        
        attackersList.innerHTML = attackersHtml;
        
        // Show
        killLoading.classList.add('hidden');
        killDetailsContainer.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading kill details:', error);
        killLoading.innerHTML = `<p class="highlight-red">ERROR: CANNOT RETRIEVE DATA</p>`;
    }
}

document.addEventListener('DOMContentLoaded', initKillDetails);

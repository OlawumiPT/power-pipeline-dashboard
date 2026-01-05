// Add this function at the top of calculations.js
export const parseTransmissionData = (transmissionStr) => {
  if (!transmissionStr || transmissionStr.trim() === "") {
    return [];
  }
  
  try {
    // Expected format: "69 kV|143.9|144.2|-|true;138 kV|549.5|95.5|-|true"
    return transmissionStr.split(';').map(point => {
      const parts = point.split('|');
      if (parts.length >= 5) {
        return {
          voltage: parts[0].trim(),
          injectionCapacity: parseFloat(parts[1]) || 0,
          withdrawalCapacity: parseFloat(parts[2]) || 0,
          constraints: parts[3].trim(),
          hasExcessCapacity: parts[4].toLowerCase() === 'true'
        };
      }
      return null;
    }).filter(point => point !== null);
  } catch (error) {
    console.error('Error parsing transmission data:', error);
    return [];
  }
};

export const findColumnName = (row, patterns) => {
  const keys = Object.keys(row);
  for (const pattern of patterns) {
    const foundKey = keys.find(key => 
      key && key.toString().toLowerCase().includes(pattern.toLowerCase())
    );
    if (foundKey) return foundKey;
  }
  return null;
};

export const filterData = (data, selectedIso, selectedProcess, selectedOwner, findColumnName) => {
  if (!data || data.length === 0) return [];
  
  let filtered = [...data];
  
  if (selectedIso !== "All") {
    filtered = filtered.filter(row => {
      const isoCol = findColumnName(row, ["ISO", "iso"]);
      const iso = isoCol ? row[isoCol] : "";
      return iso && iso.toString().trim().toUpperCase() === selectedIso.toUpperCase();
    });
  }
  
  if (selectedProcess !== "All") {
    filtered = filtered.filter(row => {
      const processCol = findColumnName(row, ["Process (P) or Bilateral (B)", "Process", "process", "P or B"]);
      const process = processCol ? row[processCol] : "";
      const processLetter = selectedProcess === "Process" ? "P" : "B";
      return process && process.toString().trim().toUpperCase() === processLetter;
    });
  }
  
  if (selectedOwner !== "All") {
    filtered = filtered.filter(row => {
      const ownerCol = findColumnName(row, ["Plant Owner", "Owner", "owner"]);
      const owner = ownerCol ? row[ownerCol] : "";
      return owner && owner.toString().trim() === selectedOwner;
    });
  }
  
  return filtered;
};

export const calculateKPIs = (jsonData, columns, setKpiRow1, setKpiRow2) => {
  const {
    projectNameCol, capacityCol, overallCol, thermalCol, redevCol,
    heatRateCol, codCol, processCol
  } = columns;

  const projectCount = jsonData.filter(row => {
    const name = row[projectNameCol];
    return name && name.toString().trim() !== "";
  }).length;

  // For demonstration - in real app, you'd import calculateProjectScores
  let totalCalculatedThermal = 0;
  let totalCalculatedRedev = 0;
  let totalCalculatedOverall = 0;
  let calculatedCount = 0;

  jsonData.forEach(row => {
    // Simplified calculation - in real app, use imported function
    const thermalScore = parseFloat(row[thermalCol] || 0);
    const redevScore = parseFloat(row[redevCol] || 0);
    const overallScore = parseFloat(row[overallCol] || 0);
    
    if (!isNaN(thermalScore)) totalCalculatedThermal += thermalScore;
    if (!isNaN(redevScore)) totalCalculatedRedev += redevScore;
    if (!isNaN(overallScore)) totalCalculatedOverall += overallScore;
    
    if (thermalScore || redevScore || overallScore) calculatedCount++;
  });

  const avgCalculatedThermal = calculatedCount > 0 ? totalCalculatedThermal / calculatedCount : 0;
  const avgCalculatedRedev = calculatedCount > 0 ? totalCalculatedRedev / calculatedCount : 0;
  const avgCalculatedOverall = calculatedCount > 0 ? totalCalculatedOverall / calculatedCount : 0;

  let totalCapacityMW = 0;
  let capacityCount = 0;
  
  jsonData.forEach(row => {
    let capacityStr = row[capacityCol] || "";
    capacityStr = capacityStr.toString().replace(/,/g, '').trim();
    
    if (capacityStr && capacityStr !== "" && 
        capacityStr.toUpperCase() !== "N/A" && 
        !capacityStr.includes("#")) {
      const capacity = parseFloat(capacityStr);
      if (!isNaN(capacity)) {
        totalCapacityMW += capacity;
        capacityCount++;
      }
    }
  });
  
  const totalCapacityGW = (totalCapacityMW / 1000).toFixed(1);
  
  let totalHeatRate = 0;
  let heatRateCount = 0;
  
  jsonData.forEach(row => {
    let heatRateStr = row[heatRateCol] || "";
    heatRateStr = heatRateStr.toString().replace(/,/g, '').trim();
    
    if (heatRateStr && heatRateStr !== "" && 
        heatRateStr.toUpperCase() !== "N/A" && 
        !heatRateStr.includes("#")) {
      const heatRate = parseFloat(heatRateStr);
      if (!isNaN(heatRate) && heatRate > 0) {
        totalHeatRate += heatRate;
        heatRateCount++;
      }
    }
  });
  
  const avgHeatRate = heatRateCount > 0 ? totalHeatRate / heatRateCount : 0;
  
  // DEBUG LOGGING for Average Age calculation
  console.log('=== DEBUG AVG AGE CALCULATION ===');
  console.log('codCol being used:', codCol);
  
  // FIXED: Use actual current year instead of hardcoded 2025
  const currentYear = new Date().getFullYear();
  console.log('Current year:', currentYear);
  
  let totalAge = 0;
  let ageCount = 0;
  let debugRows = 0;
  
  jsonData.forEach(row => {
    debugRows++;
    let codStr = row[codCol] || "";
    codStr = codStr.toString().trim();
    
    console.log(`Row ${debugRows}: codStr = "${codStr}"`);
    
    if (codStr && codStr !== "" && 
        codStr.toUpperCase() !== "N/A" && 
        !codStr.includes("#") &&
        !codStr.includes("XLOOKUP")) { // Skip Excel formulas
      
      const codMatch = codStr.toString().match(/\d{4}/);
      console.log(`  - Regex match result:`, codMatch);
      
      if (codMatch) {
        const cod = parseInt(codMatch[0]);
        console.log(`  - Parsed COD: ${cod}`);
        
        // Relaxed validation to include more years
        if (!isNaN(cod) && cod >= 1900 && cod <= currentYear + 10) { // Allow future plants up to 10 years ahead
          const age = Math.max(0, currentYear - cod); // Ensure age is not negative
          totalAge += age;
          ageCount++;
          console.log(`  - Age added: ${age}, totalAge now: ${totalAge}, ageCount: ${ageCount}`);
        } else {
          console.log(`  - COD ${cod} rejected (must be >=1900 and <=${currentYear + 10})`);
        }
      }
    } else {
      console.log(`  - Skipped: empty, N/A, #, or Excel formula`);
    }
  });
  
  console.log(`Final: totalAge = ${totalAge}, ageCount = ${ageCount}`);
  const avgAge = ageCount > 0 ? totalAge / ageCount : 0;
  console.log(`Avg Age: ${avgAge}`);
  
  let processCount = 0;
  let bilateralCount = 0;
  
  jsonData.forEach(row => {
    const processType = row[processCol] || "";
    const typeStr = processType.toString().toUpperCase();
    if (typeStr === "P") {
      processCount++;
    } else if (typeStr === "B") {
      bilateralCount++;
    }
  });

  setKpiRow1([
    { 
      label: "PROJECTS", 
      value: projectCount.toString(), 
      sub: `${processCount}P / ${bilateralCount}B`,
      colorClass: "projects"
    },
    { 
      label: "TOTAL CAPACITY", 
      value: `${totalCapacityGW} GW`, 
      sub: "Nameplate",
      colorClass: "capacity"
    },
    { 
      label: "AVG HEAT RATE", 
      value: Math.round(avgHeatRate).toLocaleString(), 
      sub: "Btu/kWh",
      colorClass: "heat-rate"
    },
    { 
      label: "AVG AGE", 
      value: `${Math.round(avgAge)} yrs`, 
      sub: "Vintage",
      colorClass: "age"
    },
  ]);

  setKpiRow2([
    { 
      label: "TOP QUARTILE", 
      value: "5", 
      sub: "3.2 GW",
      colorClass: "quartile"
    },
    { 
      label: "AVG OVERALL", 
      value: avgCalculatedOverall.toFixed(2), 
      sub: "/6.0",
      colorClass: "overall"
    },
    { 
      label: "AVG THERMAL", 
      value: avgCalculatedThermal.toFixed(2), 
      sub: "/3.0",
      colorClass: "thermal"
    },
    { 
      label: "AVG REDEV", 
      value: avgCalculatedRedev.toFixed(2), 
      sub: "/3.0",
      colorClass: "redev"
    },
  ]);
};

export const calculateIsoData = (jsonData, isoCol, capacityCol, setIsoData) => {
  const isoGroups = {};
  
  jsonData.forEach(row => {
    const iso = row[isoCol] || "Unknown";
    let capacityStr = row[capacityCol] || "";
    capacityStr = capacityStr.toString().replace(/,/g, '').trim();
    
    if (iso && iso.toString().trim() !== "" && 
        capacityStr && capacityStr !== "" && 
        capacityStr.toUpperCase() !== "N/A" && 
        !capacityStr.includes("#")) {
      
      const capacity = parseFloat(capacityStr);
      if (!isNaN(capacity)) {
        if (!isoGroups[iso]) {
          isoGroups[iso] = {
            capacity: 0,
            count: 0
          };
        }
        isoGroups[iso].capacity += capacity;
        isoGroups[iso].count++;
      }
    }
  });

  const isoArray = Object.keys(isoGroups).map(iso => ({
    name: iso,
    value: parseFloat((isoGroups[iso].capacity / 1000).toFixed(1)),
    count: isoGroups[iso].count
  })).sort((a, b) => b.value - a.value);

  setIsoData(isoArray);
};

export const calculateTechData = (jsonData, techCol, capacityCol, setTechData) => {
  const techGroups = {};
  
  jsonData.forEach(row => {
    const tech = row[techCol] || "Unknown";
    let capacityStr = row[capacityCol] || "";
    capacityStr = capacityStr.toString().replace(/,/g, '').trim();
    
    if (tech && tech.toString().trim() !== "" && 
        capacityStr && capacityStr !== "" && 
        capacityStr.toUpperCase() !== "N/A" && 
        !capacityStr.includes("#")) {
      
      const capacity = parseFloat(capacityStr);
      if (!isNaN(capacity)) {
        if (!techGroups[tech]) {
          techGroups[tech] = {
            capacity: 0,
            count: 0
          };
        }
        techGroups[tech].capacity += capacity;
        techGroups[tech].count++;
      }
    }
  });

  const techArray = Object.keys(techGroups).map(tech => ({
    tech: tech,
    value: parseFloat(techGroups[tech].capacity.toFixed(0)),
    count: techGroups[tech].count
  })).sort((a, b) => b.value - a.value);

  setTechData(techArray);
};

export const calculateRedevelopmentTypes = (jsonData, redevBaseCaseCol, setRedevelopmentTypes) => {
  const redevCounts = {};
  
  jsonData.forEach(row => {
    const redevStr = row[redevBaseCaseCol] || "";
    if (redevStr && redevStr.toString().trim() !== "") {
      const types = redevStr.toString().split(/[\n\/]/).map(t => t.trim()).filter(t => t);
      
      types.forEach(type => {
        let cleanType = type.trim();
        
        if (cleanType.toLowerCase().includes("bess")) {
          cleanType = "BESS";
        } else if (cleanType.toLowerCase().includes("gas") || cleanType.toLowerCase().includes("thermal")) {
          cleanType = "Gas/Thermal";
        } else if (cleanType.toLowerCase().includes("solar")) {
          cleanType = "Solar";
        } else if (cleanType.toLowerCase().includes("powered") || cleanType.toLowerCase().includes("land")) {
          cleanType = "Powered Land";
        } else if (cleanType.toLowerCase().includes("plant") || cleanType.toLowerCase().includes("optimization")) {
          cleanType = "Plant Optimization";
        }
        
        if (cleanType) {
          redevCounts[cleanType] = (redevCounts[cleanType] || 0) + 1;
        }
      });
    }
  });

  const redevArray = Object.keys(redevCounts).map(type => {
    let colorClass = "gray";
    let inlineStyle = {};
    
    if (type === "BESS") {
      colorClass = "green";
    } else if (type === "Gas/Thermal") {
      colorClass = "red";
    } else if (type === "Solar") {
      colorClass = "yellow";
    } else if (type === "Powered Land") {
      colorClass = "blue";
    } else if (type === "Plant Optimization") {
      colorClass = "purple";
      inlineStyle = {
        background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
        color: "white",
        border: "1px solid #7c3aed"
      };
    }
    
    return {
      label: type,
      value: redevCounts[type],
      className: `kpi-chip ${colorClass}`,
      style: inlineStyle
    };
  }).sort((a, b) => b.value - a.value);

  setRedevelopmentTypes(redevArray);
};

export const calculateCounterpartyData = (jsonData, ownerCol, overallCol, capacityCol, setCounterparties) => {
  const ownerGroups = {};
  
  jsonData.forEach(row => {
    const owner = row[ownerCol] || "Unknown";
    let capacityStr = row[capacityCol] || "";
    capacityStr = capacityStr.toString().replace(/,/g, '').trim();
    const overallStr = row[overallCol] || "";
    
    if (owner && owner.toString().trim() !== "" && 
        capacityStr && capacityStr !== "" && 
        capacityStr.toUpperCase() !== "N/A" && 
        !capacityStr.includes("#")) {
      
      const capacity = parseFloat(capacityStr);
      const overall = parseFloat(overallStr) || 0;
      
      if (!isNaN(capacity)) {
        if (!ownerGroups[owner]) {
          ownerGroups[owner] = {
            count: 0,
            totalCapacity: 0,
            totalOverall: 0
          };
        }
        ownerGroups[owner].count++;
        ownerGroups[owner].totalCapacity += capacity;
        ownerGroups[owner].totalOverall += overall;
      }
    }
  });

  const counterpartyArray = Object.keys(ownerGroups).map(owner => {
    const group = ownerGroups[owner];
    const avgScore = group.count > 0 ? (group.totalOverall / group.count).toFixed(2) : "0.00";
    const capacityGW = (group.totalCapacity / 1000).toFixed(1);
    
    return {
      name: owner,
      projects: `${group.count} project${group.count > 1 ? 's' : ''}`,
      gw: `${capacityGW} GW`,
      avg: avgScore
    };
  }).sort((a, b) => {
    const aGW = parseFloat(a.gw);
    const bGW = parseFloat(b.gw);
    return bGW - aGW;
  });

  setCounterparties(counterpartyArray);
};

export const calculatePipelineData = (jsonData, allColumns, setPipelineRows) => {
  const {
    projectNameCol, ownerCol, overallCol, thermalCol, redevCol,
    isoCol, zoneCol, capacityCol, techCol, heatRateCol, cfCol, codCol,
    locationCol, projectCodenameCol, redevLoadCol, icScoreCol, numberOfSitesCol,
    gasReferenceCol, contactCol, siteAcreageCol, fuelCol, redevCodCol, marketsCol,
    thermalOptimizationCol, environmentalScoreCol, marketScoreCol, infraCol, ixCol,
    coLocateRepowerCol, transactibilityCol, plantCodCol, legacyCodCol,
    transmissionCol,  // ADD THIS
    transactabilityScoresCol, // ADD THIS - Column AH
    transactabilityCol  // ADD THIS - Column AI
  } = allColumns;

  const pipelineData = jsonData.map((row, index) => {
    let capacityStr = row[capacityCol] || "";
    capacityStr = capacityStr.toString().replace(/,/g, '').trim();
    const mw = parseFloat(capacityStr) || 0;
    
    let heatRateStr = row[heatRateCol] || "";
    heatRateStr = heatRateStr.toString().replace(/,/g, '').trim();
    const hr = parseFloat(heatRateStr) || 0;
    
    // Note: calculateProjectScores would be imported from scoring.js
    // For now, use existing values
    const overall = parseFloat(row[overallCol]) || 0;
    const thermal = parseFloat(row[thermalCol]) || 0;
    const redev = parseFloat(row[redevCol]) || 0;

    // FIX: Use parseTransmissionData which should now be defined
    const transmissionData = parseTransmissionData(row[transmissionCol] || "");
    
    // CRITICAL: Extract Transactability data
    const transactabilityScore = row[transactabilityScoresCol] || ""; // Column AH (numeric: 2, 3, #N/A)
    const transactability = row[transactabilityCol] || ""; // Column AI (text description)
    
    let codStr = row[legacyCodCol] || ""; // Use legacy COD instead of plant COD
    let cod = 0;
    if (codStr && codStr.toString().trim() !== "") {
      const codMatch = codStr.toString().match(/\d{4}/);
      if (codMatch) {
        cod = parseInt(codMatch[0]) || 0;
      }
    }
    
    let cf = row[cfCol] || "0%";
    if (cf && cf.toString().includes("%")) {
    } else if (cf && !isNaN(parseFloat(cf))) {
      cf = `${(parseFloat(cf) * 100).toFixed(1)}%`;
    } else {
      cf = "0%";
    }

    const detailData = {
      "Project Name": row[projectNameCol] || "",
      "Project Codename": row[projectCodenameCol] || "",
      "Plant Owner": row[ownerCol] || "",
      "Location": row[locationCol] || "",
      "Overall Project Score": row[overallCol] || "",
      "Thermal Operating Score": row[thermalCol] || "",
      "Redevelopment Score": row[redevCol] || "",
      "Redevelopment (Load) Score": row[redevLoadCol] || "",
      "I&C Score": row[icScoreCol] || "",
      "Legacy Nameplate Capacity (MW)": row[capacityCol] || "",
      "Tech": row[techCol] || "",
      "Heat Rate (Btu/kWh)": row[heatRateCol] || "",
      "2024 Capacity Factor": cf,
      "Legacy COD": row[legacyCodCol] || "",
      "Plant COD": row[plantCodCol] || "",
      "Fuel": row[fuelCol] || "",
      "ISO": row[isoCol] || "",
      "Zone/Submarket": row[zoneCol] || "",
      "Markets": row[marketsCol] || "",
      "Gas Reference": row[gasReferenceCol] || "",
      "Process (P) or Bilateral (B)": row[allColumns.processCol] || "",
      "Number of Sites": row[numberOfSitesCol] || "",
      "Redevelopment Base Case": row[allColumns.redevBaseCaseCol] || "",
      "Redev COD": row[redevCodCol] || "",
      "Thermal Optimization": row[thermalOptimizationCol] || "",
      "Co-Locate/Repower": row[coLocateRepowerCol] || "",
      "Environmental Score": row[environmentalScoreCol] || "",
      "Market Score": row[marketScoreCol] || "",
      "Infra": row[infraCol] || "",
      "IX": row[ixCol] || "",
      "Transactibility": row[transactibilityCol] || "",
      // CRITICAL: Add Transactability fields
      "Transactability Scores": transactabilityScore || "", // Column AH
      "Transactability": transactability || "", // Column AI
      "Transmission Data": row[transmissionCol] || "",  // ADD THIS
      "Contact": row[contactCol] || "",
      "Site Acreage": row[siteAcreageCol] || "",
      "Calculated Overall": overall.toFixed(2),
      "Calculated Thermal": thermal.toFixed(2),
      "Calculated Redevelopment": redev.toFixed(2),
      "Score Breakdown": {}
    };

    return {
      id: index + 1,
      asset: row[projectNameCol] || "",
      location: row[locationCol] || "",
      owner: row[ownerCol] || "",
      overall: overall,
      thermal: thermal,
      redev: redev,
      // CRITICAL: Add Transactability fields to pipeline row
      transactabilityScore: transactabilityScore,
      transactability: transactability,
      mkt: row[isoCol] || "",
      zone: row[zoneCol] || "",
      mw: mw,
      tech: row[techCol] || "",
      hr: hr,
      cf: cf,
      cod: cod,
      detailData: detailData,
      transmissionData: transmissionData
    };
  }).filter(row => row.asset && row.asset.trim() !== "");

  setPipelineRows(pipelineData);
};

export const calculateAllData = (jsonData, headers, setters) => {
  const {
    setKpiRow1, setKpiRow2, setIsoData, setTechData, 
    setRedevelopmentTypes, setCounterparties, setPipelineRows
  } = setters;

  if (!jsonData || jsonData.length === 0) {
    setKpiRow1([]);
    setKpiRow2([]);
    setIsoData([]);
    setTechData([]);
    setRedevelopmentTypes([]);
    setCounterparties([]);
    setPipelineRows([]);
    return;
  }

  const findColumnIndex = (patterns) => {
    for (const pattern of patterns) {
      const index = headers.findIndex(header => 
        header && header.toString().toLowerCase().includes(pattern.toLowerCase())
      );
      if (index !== -1) {
        console.log(`Found column for pattern "${pattern}": ${headers[index]} at index ${index}`);
        return index;
      }
    }
    console.log(`No column found for patterns: ${patterns.join(', ')}`);
    return -1;
  };

  // DEBUG: Log all headers
  console.log('=== CALCULATIONS DEBUG ===');
  console.log('All headers:', headers);
  console.log('First row sample:', jsonData[0]);

  // Add this line to the column definitions in calculateAllData function
  const transmissionCol = findColumnIndex(["transmission data", "transmission"]) !== -1 ? headers[findColumnIndex(["transmission data", "transmission"])] : "Transmission Data";
  
  // CRITICAL: Add Transactability column mappings
  const transactabilityScoresCol = findColumnIndex(["transactability scores", "transactability score"]) !== -1 ? headers[findColumnIndex(["transactability scores", "transactability score"])] : "Transactability Scores";
  const transactabilityCol = findColumnIndex(["transactability", "transactionality"]) !== -1 ? headers[findColumnIndex(["transactability", "transactionality"])] : "Transactability";
  
  const projectNameCol = findColumnIndex(["project name"]) !== -1 ? headers[findColumnIndex(["project name"])] : "Project Name";
  const capacityCol = findColumnIndex(["legacy nameplate capacity", "capacity", "mw"]) !== -1 ? headers[findColumnIndex(["legacy nameplate capacity", "capacity", "mw"])] : "Legacy Nameplate Capacity (MW)";
  const overallCol = findColumnIndex(["overall project score", "overall"]) !== -1 ? headers[findColumnIndex(["overall project score", "overall"])] : "Overall Project Score";
  const thermalCol = findColumnIndex(["thermal operating score", "thermal"]) !== -1 ? headers[findColumnIndex(["thermal operating score", "thermal"])] : "Thermal Operating Score";
  const redevCol = findColumnIndex(["redevelopment score", "redevelopment", "redev"]) !== -1 ? headers[findColumnIndex(["redevelopment score", "redevelopment", "redev"])] : "Redevelopment Score";
  const heatRateCol = findColumnIndex(["heat rate", "hr"]) !== -1 ? headers[findColumnIndex(["heat rate", "hr"])] : "Heat Rate (Btu/kWh)";
  
  // FIXED: Use Legacy COD instead of Plant COD for age calculations
  const legacyCodCol = findColumnIndex(["legacy cod", "cod", "commissioning year", "year", "legacy"]) !== -1 ? headers[findColumnIndex(["legacy cod", "cod", "commissioning year", "year", "legacy"])] : "Legacy COD";
  
  // Still find Plant COD for display purposes
  const plantCodCol = findColumnIndex(["plant cod", "plant  cod", "cod (plant)"]) !== -1 ? headers[findColumnIndex(["plant cod", "plant  cod", "cod (plant)"])] : "Plant COD";
  
  const processCol = findColumnIndex(["process", "bilateral", "p or b"]) !== -1 ? headers[findColumnIndex(["process", "bilateral", "p or b"])] : "Process (P) or Bilateral (B)";
  const isoCol = findColumnIndex(["iso"]) !== -1 ? headers[findColumnIndex(["iso"])] : "ISO";
  const techCol = findColumnIndex(["tech"]) !== -1 ? headers[findColumnIndex(["tech"])] : "Tech";
  const redevBaseCaseCol = findColumnIndex(["redevelopment base case"]) !== -1 ? headers[findColumnIndex(["redevelopment base case"])] : "Redevelopment Base Case";
  const ownerCol = findColumnIndex(["plant owner", "owner"]) !== -1 ? headers[findColumnIndex(["plant owner", "owner"])] : "Plant Owner";
  const locationCol = findColumnIndex(["location"]) !== -1 ? headers[findColumnIndex(["location"])] : "Location";
  const zoneCol = findColumnIndex(["zone/submarket", "zone"]) !== -1 ? headers[findColumnIndex(["zone/submarket", "zone"])] : "Zone/Submarket";
  const cfCol = findColumnIndex(["2024 capacity factor", "capacity factor", "cf"]) !== -1 ? headers[findColumnIndex(["2024 capacity factor", "capacity factor", "cf"])] : "2024 Capacity Factor";
  const projectCodenameCol = findColumnIndex(["project codename"]) !== -1 ? headers[findColumnIndex(["project codename"])] : "Project Codename";
  const redevLoadCol = findColumnIndex(["redevelopment (load) score"]) !== -1 ? headers[findColumnIndex(["redevelopment (load) score"])] : "Redevelopment (Load) Score";
  const icScoreCol = findColumnIndex(["i&c score"]) !== -1 ? headers[findColumnIndex(["i&c score"])] : "I&C Score";
  const numberOfSitesCol = findColumnIndex(["number of sites"]) !== -1 ? headers[findColumnIndex(["number of sites"])] : "Number of Sites";
  const gasReferenceCol = findColumnIndex(["gas reference"]) !== -1 ? headers[findColumnIndex(["gas reference"])] : "Gas Reference";
  const contactCol = findColumnIndex(["contact"]) !== -1 ? headers[findColumnIndex(["contact"])] : "Contact";
  const siteAcreageCol = findColumnIndex(["site acreage"]) !== -1 ? headers[findColumnIndex(["site acreage"])] : "Site Acreage";
  const fuelCol = findColumnIndex(["fuel"]) !== -1 ? headers[findColumnIndex(["fuel"])] : "Fuel";
  const redevCodCol = findColumnIndex(["redev cod"]) !== -1 ? headers[findColumnIndex(["redev cod"])] : "Redev COD";
  const marketsCol = findColumnIndex(["markets"]) !== -1 ? headers[findColumnIndex(["markets"])] : "Markets";
  const thermalOptimizationCol = findColumnIndex(["thermal optimization"]) !== -1 ? headers[findColumnIndex(["thermal optimization"])] : "Thermal Optimization";
  const environmentalScoreCol = findColumnIndex(["envionmental score", "environmental score"]) !== -1 ? headers[findColumnIndex(["envionmental score", "environmental score"])] : "Environmental Score";
  const marketScoreCol = findColumnIndex(["market score"]) !== -1 ? headers[findColumnIndex(["market score"])] : "Market Score";
  const infraCol = findColumnIndex(["infra"]) !== -1 ? headers[findColumnIndex(["infra"])] : "Infra";
  const ixCol = findColumnIndex(["ix"]) !== -1 ? headers[findColumnIndex(["ix"])] : "IX";
  const coLocateRepowerCol = findColumnIndex(["co-locate/repower", "co-locate", "repower"]) !== -1 ? headers[findColumnIndex(["co-locate/repower", "co-locate", "repower"])] : "Co-Locate/Repower";
  const transactibilityCol = findColumnIndex(["transactibility"]) !== -1 ? headers[findColumnIndex(["transactibility"])] : "Transactibility";
  
  const allColumns = {
    projectNameCol, capacityCol, overallCol, thermalCol, redevCol,
    heatRateCol, legacyCodCol, plantCodCol, processCol, isoCol, techCol, redevBaseCaseCol,
    ownerCol, locationCol, zoneCol, cfCol, projectCodenameCol, redevLoadCol,
    icScoreCol, numberOfSitesCol, gasReferenceCol, contactCol, siteAcreageCol,
    fuelCol, redevCodCol, marketsCol, thermalOptimizationCol, environmentalScoreCol,
    marketScoreCol, infraCol, ixCol, coLocateRepowerCol, transactibilityCol,
    transmissionCol, // Add this line to include transmission data column
    // CRITICAL: Add Transactability columns
    transactabilityScoresCol,
    transactabilityCol
  };

  // FIXED: Pass legacyCodCol (not plantCodCol) to calculateKPIs for age calculations
  calculateKPIs(jsonData, {
    projectNameCol, capacityCol, overallCol, thermalCol, redevCol,
    heatRateCol, 
    codCol: legacyCodCol, // Use Legacy COD for age calculations
    processCol
  }, setKpiRow1, setKpiRow2);

  calculateIsoData(jsonData, isoCol, capacityCol, setIsoData);
  calculateTechData(jsonData, techCol, capacityCol, setTechData);
  calculateRedevelopmentTypes(jsonData, redevBaseCaseCol, setRedevelopmentTypes);
  calculateCounterpartyData(jsonData, ownerCol, overallCol, capacityCol, setCounterparties);
  calculatePipelineData(jsonData, allColumns, setPipelineRows);
};
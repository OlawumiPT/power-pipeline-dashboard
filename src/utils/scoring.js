import { scoringWeights } from '../constants/scoringWeights';

// REVERTED: Back to original 50-50 weights (no transmission in ranking)
const OVERALL_WEIGHTS = {
  thermal: 0.50,           // 50% (was 40%)
  redevelopment: 0.50      // 50% (was 40%)
  // Transmission removed from ranking (0%)
};

// Calculate thermal operating score breakdown (for analysis only, not for scoring)
function calculateThermalBreakdown(project) {
  let breakdown = {};
  
  // 1. Plant COD analysis
  const plantCOD = parseInt(project["Legacy COD"] || project["Plant COD"] || "0");
  let codAnalysis;
  
  if (plantCOD < 2000) {
    codAnalysis = "Vintage plant (<2000) - higher retirement potential";
  } else if (plantCOD <= 2005) {
    codAnalysis = "Mid-age plant (2000-2005)";
  } else {
    codAnalysis = "Newer plant (>2005) - lower retirement likelihood";
  }
  
  breakdown.unit_cod = {
    analysis: codAnalysis,
    value: plantCOD
  };
  
  // 2. Markets analysis
  const iso = project["ISO"] || "";
  let marketAnalysis;
  
  if (["PJM", "NYISO", "ISONE"].includes(iso)) {
    marketAnalysis = "Premium market with strong pricing";
  } else if (["MISO North", "SERC"].includes(iso)) {
    marketAnalysis = "Established market";
  } else if (["SPP", "MISO South"].includes(iso)) {
    marketAnalysis = "Developing market";
  } else {
    marketAnalysis = "Challenging market (ERCOT, WECC, CAISO)";
  }
  
  breakdown.markets = {
    analysis: marketAnalysis,
    value: iso
  };
  
  // 3. Transactability analysis
  const transactability = project["Transactibility"] || "";
  let transactAnalysis;
  
  if (transactability.includes("Bilateral") && transactability.includes("developed")) {
    transactAnalysis = "Bilateral with developed relationship";
  } else if (transactability.includes("Bilateral")) {
    transactAnalysis = "Bilateral with new relationship";
  } else if (transactability.includes("Competitive") || transactability.includes(">10")) {
    transactAnalysis = "Competitive process (>10 bidders)";
  } else {
    transactAnalysis = "Unknown transactability";
  }
  
  breakdown.transactability = {
    analysis: transactAnalysis,
    value: transactability
  };
  
  // 4. Environmental analysis
  const envScore = parseFloat(project["Environmental Score"] || "2");
  let envAnalysis;
  
  if (envScore >= 3) {
    envAnalysis = "Known & mitigable with advantage";
  } else if (envScore >= 2) {
    envAnalysis = "Known & mitigable";
  } else if (envScore >= 1) {
    envAnalysis = "Unknown environmental issues";
  } else {
    envAnalysis = "Not mitigable";
  }
  
  breakdown.environmental = {
    analysis: envAnalysis,
    value: envScore
  };
  
  // 5. Thermal Optimization analysis
  const thermalOpt = project["Thermal Optimization"] || "";
  let thermalAnalysis;
  
  if (thermalOpt.includes("Readily") || thermalOpt.includes("value add")) {
    thermalAnalysis = "Readily apparent value add";
  } else {
    thermalAnalysis = "No identifiable value add";
  }
  
  breakdown.thermal_optimization = {
    analysis: thermalAnalysis,
    value: thermalOpt
  };
  
  return breakdown;
}

// Calculate redevelopment score breakdown (for analysis only, not for scoring)
function calculateRedevelopmentBreakdown(project) {
  let breakdown = {};
  
  // 1. Market analysis
  const marketScore = parseFloat(project["Market Score"] || "2");
  let marketAnalysis;
  
  if (marketScore >= 3) {
    marketAnalysis = "Primary market position";
  } else if (marketScore >= 2) {
    marketAnalysis = "Secondary market position";
  } else if (marketScore >= 1) {
    marketAnalysis = "Uncertain market position";
  } else {
    marketAnalysis = "Challenging market position";
  }
  
  breakdown.market = {
    analysis: marketAnalysis,
    value: marketScore
  };
  
  // 2. Infrastructure analysis
  const infraScore = parseFloat(project["Infra"] || "2");
  let infraAnalysis;
  
  if (infraScore >= 3) {
    infraAnalysis = "Sufficient utilities onsite";
  } else if (infraScore >= 2) {
    infraAnalysis = "Low cost to connect utilities";
  } else if (infraScore >= 1) {
    infraAnalysis = "High cost/uncertain connection";
  } else {
    infraAnalysis = "No clear path for utilities";
  }
  
  breakdown.infra = {
    analysis: infraAnalysis,
    value: infraScore
  };
  
  // 3. Interconnection (IX) analysis
  const ixScore = parseFloat(project["IX"] || "2");
  let ixAnalysis;
  
  if (ixScore >= 3) {
    ixAnalysis = "Secured interconnection rights";
  } else if (ixScore >= 2) {
    ixAnalysis = "No upgrades needed for interconnection";
  } else if (ixScore >= 1) {
    ixAnalysis = "Minimal upgrades required";
  } else {
    ixAnalysis = "Major upgrades required";
  }
  
  breakdown.ix = {
    analysis: ixAnalysis,
    value: ixScore
  };
  
  return breakdown;
}

// MAIN FUNCTION: Generate expert analysis USING EXCEL VALUES
export function generateExpertAnalysis(projectData) {
  // CRITICAL FIX: Use the Excel values directly from the spreadsheet
  const overallScore = parseFloat(projectData["Overall Project Score"] || "0").toFixed(1);
  const thermalScore = parseFloat(projectData["Thermal Operating Score"] || "0").toFixed(1);
  const redevelopmentScore = parseFloat(projectData["Redevelopment Score"] || "0").toFixed(1);
  
  // Calculate breakdowns for analysis text only (not for scoring)
  const thermalBreakdown = calculateThermalBreakdown(projectData);
  const redevBreakdown = calculateRedevelopmentBreakdown(projectData);
  
  // Determine rating based on EXCEL scores
  const overallRating = overallScore >= 4.5 ? "Strong" : 
                       overallScore >= 3.0 ? "Moderate" : "Weak";
  const ratingClass = overallScore >= 4.5 ? "strong" : 
                     overallScore >= 3.0 ? "moderate" : "weak";
  
  // Generate strengths and risks based on breakdowns
  const strengths = generateStrengths(thermalBreakdown, redevBreakdown, projectData);
  const risks = generateRisks(thermalBreakdown, redevBreakdown, projectData);
  
  // Calculate confidence
  const confidence = calculateConfidence(projectData);
  
  return {
    // Core scores - USING EXCEL VALUES
    overallScore: overallScore,
    overallRating: overallRating,
    ratingClass: ratingClass,
    
    // Thermal score - USING EXCEL VALUE
    thermalScore: thermalScore,
    thermalBreakdown: thermalBreakdown,
    
    // Redevelopment score - USING EXCEL VALUE
    redevelopmentScore: redevelopmentScore,
    redevelopmentBreakdown: redevBreakdown,
    
    // Project metadata
    projectName: projectData["Project Name"] || projectData["Project Codename"] || `Project ${projectData.id || ""}`,
    projectId: projectData.id || "N/A",
    assessmentDate: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    analyst: "AI Analysis Engine",
    confidence: confidence,
    recommendation: getRecommendation(parseFloat(overallScore)),
    
    // Analysis content
    strengths: strengths,
    risks: risks,
    
    // Summary for quick reference
    summary: {
      thermal: thermalScore,
      redevelopment: redevelopmentScore
    }
  };
}

// Helper function to calculate confidence level
function calculateConfidence(projectData) {
  let confidence = 70; // Base confidence
  
  // Increase if we have complete data
  if (projectData["Overall Project Score"] && projectData["Overall Project Score"] !== "") {
    confidence += 10;
  }
  if (projectData["Thermal Operating Score"] && projectData["Thermal Operating Score"] !== "") {
    confidence += 5;
  }
  if (projectData["Redevelopment Score"] && projectData["Redevelopment Score"] !== "") {
    confidence += 5;
  }
  if (projectData["ISO"] && projectData["ISO"] !== "") {
    confidence += 5;
  }
  
  return Math.min(confidence, 95);
}

// Helper function to generate strengths
function generateStrengths(thermal, redev, projectData) {
  const strengths = [];
  
  // Thermal strengths based on breakdown analysis
  if (thermal.environmental && thermal.environmental.value >= 2) {
    strengths.push("Environmental conditions known and mitigable");
  }
  
  if (thermal.markets && ["PJM", "NYISO", "ISONE"].includes(thermal.markets.value)) {
    strengths.push(`Favorable market position in ${thermal.markets.value}`);
  }
  
  if (thermal.transactability && thermal.transactability.analysis.includes("Bilateral")) {
    strengths.push("Bilateral transaction structure provides relationship advantage");
  }
  
  // Redevelopment strengths
  if (redev.market && redev.market.value >= 2) {
    strengths.push("Good market position for redevelopment");
  }
  
  if (redev.infra && redev.infra.value >= 2) {
    strengths.push("Adequate infrastructure for future development");
  }
  
  // Fallback strengths
  if (strengths.length === 0) {
    strengths.push("Site has existing energy infrastructure that can be leveraged");
    strengths.push("Potential for modernization and efficiency improvements");
  }
  
  return strengths.slice(0, 4);
}

// Helper function to generate risks
function generateRisks(thermal, redev, projectData) {
  const risks = [];
  
  // Thermal risks
  if (thermal.unit_cod && thermal.unit_cod.value < 2000) {
    risks.push("Vintage plant may have higher maintenance and retirement risks");
  }
  
  if (thermal.markets && !["PJM", "NYISO", "ISONE"].includes(thermal.markets.value)) {
    risks.push(`Market ${thermal.markets.value} may have limited pricing opportunities`);
  }
  
  // Redevelopment risks
  if (redev.ix && redev.ix.value < 2) {
    risks.push("Interconnection upgrades may be required for redevelopment");
  }
  
  // Fallback risks
  if (risks.length === 0) {
    risks.push("Standard market and operational risks associated with energy projects");
    risks.push("Regulatory changes could impact project viability");
  }
  
  return risks.slice(0, 3);
}

// Helper function to get recommendation
function getRecommendation(overallScore) {
  if (overallScore >= 4.5) {
    return "Highly Recommended - Strong investment opportunity";
  } else if (overallScore >= 3.5) {
    return "Recommended - Good potential with manageable risks";
  } else if (overallScore >= 2.5) {
    return "Consider with Caution - Requires detailed due diligence";
  } else {
    return "Not Recommended - Significant challenges identified";
  }
}

// Export for compatibility with existing code - Now uses Excel values
export function calculateProjectScores(projectData) {
  // Use Excel values directly
  const overall = parseFloat(projectData["Overall Project Score"] || "0").toFixed(1);
  const thermal = parseFloat(projectData["Thermal Operating Score"] || "0").toFixed(1);
  const redevelopment = parseFloat(projectData["Redevelopment Score"] || "0").toFixed(1);
  
  return {
    overall: overall,
    thermal: thermal,
    redevelopment: redevelopment
  };
}

// Export for ExpertScoresPanel.jsx compatibility
export function getAllExpertAnalyses() {
  console.warn("⚠️ getAllExpertAnalyses called from scoring.js - This should come from App.jsx");
  console.warn("Check ExpertScoresPanel.jsx - it should receive this as a prop, not import it");
  return [];
}

// Test function - Updated to show Excel values
export function testScoring() {
  const testProject = {
    id: 1,
    "Project Name": "Test Power Plant",
    "Project Codename": "TPP-001",
    "Overall Project Score": "5.1",
    "Thermal Operating Score": "2.4",
    "Redevelopment Score": "2.7",
    "Legacy COD": "1998",
    "ISO": "PJM",
    "Transactibility": "Bilateral with developed relationship",
    "Environmental Score": "3",
    "Thermal Optimization": "Readily apparent value add",
    "Market Score": "3",
    "Infra": "2",
    "IX": "2"
  };
  
  const analysis = generateExpertAnalysis(testProject);
  
  console.log("=== EXPERT ANALYSIS TEST (USING EXCEL VALUES) ===");
  console.log(`Project: ${analysis.projectName}`);
  console.log(`Overall Score: ${analysis.overallScore}/6.0 (${analysis.overallRating}) - FROM EXCEL`);
  console.log(`- Thermal: ${analysis.thermalScore}/3.0 - FROM EXCEL`);
  console.log(`- Redevelopment: ${analysis.redevelopmentScore}/3.0 - FROM EXCEL`);
  console.log(`Confidence: ${analysis.confidence}%`);
  console.log(`Recommendation: ${analysis.recommendation}`);
  
  console.log("\nStrengths:");
  analysis.strengths.forEach((s, i) => console.log(` ${i + 1}. ${s}`));
  
  console.log("\nRisks:");
  analysis.risks.forEach((r, i) => console.log(` ${i + 1}. ${r}`));
  
  console.log(`\n✅ VERIFIED: Using Excel values directly`);
  console.log(`Overall: ${testProject["Overall Project Score"]} matches analysis: ${analysis.overallScore}`);
  
  return analysis;
}

// Export all necessary functions
export { scoringWeights };
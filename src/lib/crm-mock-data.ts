import {
  Slide1Data,
  Slide2Data,
  Slide3Data,
  Slide4Data,
  Slide5Data,
  RecognitionData,
  AdminCampaignTargetItem,
} from "@/types";
import { getExampleBenchmarkDataset } from "@/lib/productivity/points-capacity";

export function getMockSlide1Data(dateStr?: string): Slide1Data {
  return {
    kpi_cards: {
      total_agents: 48,
      present_today: 44,
      absent_today: 4,
      late_today: 3,
    },
    campaigns: [
      {
        campaign_id: 101,
        campaign_name: "FinTech Enterprise Acceleration",
        campaign_code: "FIN-2026",
        client_code: "CL-FIN",
        campaign_type: "Outbound B2B",
        description: "Targeting VP of Engineering & CTOs at tier-1 financial institutions.",
        monthly_allocation: 1200,
        daily_target: 55,
        generated_leads: 62,
        qualified_leads: 48,
        disqualified_leads: 6,
        pending_qa: 8,
        remaining_leads_to_qualify: 7,
        completion_percentage: 87.3,
      },
      {
        campaign_id: 102,
        campaign_name: "Cloud SaaS Infrastructure Tier 1",
        campaign_code: "SAAS-01",
        client_code: "CL-SAAS",
        campaign_type: "Inbound Qualified",
        description: "High intent product trials and cloud architectural assessment requests.",
        monthly_allocation: 950,
        daily_target: 45,
        generated_leads: 49,
        qualified_leads: 41,
        disqualified_leads: 4,
        pending_qa: 4,
        remaining_leads_to_qualify: 4,
        completion_percentage: 91.1,
      },
      {
        campaign_id: 103,
        campaign_name: "CyberSecurity Defense Solutions",
        campaign_code: "SEC-90",
        client_code: "CL-SEC",
        campaign_type: "Account Based Marketing",
        description: "Mid-market enterprise security audits and SOC2 compliance inquiries.",
        monthly_allocation: 800,
        daily_target: 38,
        generated_leads: 34,
        qualified_leads: 28,
        disqualified_leads: 3,
        pending_qa: 3,
        remaining_leads_to_qualify: 10,
        completion_percentage: 73.7,
      },
      {
        campaign_id: 104,
        campaign_name: "HealthTech Telehealth Outreach",
        campaign_code: "HTH-44",
        client_code: "CL-HTH",
        campaign_type: "Healthcare Direct",
        description: "HIPAA-compliant telemedicine platforms and clinical scheduling providers.",
        monthly_allocation: 650,
        daily_target: 30,
        generated_leads: 35,
        qualified_leads: 31,
        disqualified_leads: 2,
        pending_qa: 2,
        remaining_leads_to_qualify: 0,
        completion_percentage: 103.3,
      },
    ],
    late_comers: [
      {
        user_id: 12,
        full_name: "Marcus Vance",
        role: "Senior SDR",
        punch_in: "17:47:12",
        shift_start_time: "17:30:00",
        grace_minutes: 10,
        late_minutes: 7,
        status: "Late Present",
      },
      {
        user_id: 19,
        full_name: "Aaliyah Chen",
        role: "Inbound Specialist",
        punch_in: "17:51:30",
        shift_start_time: "17:30:00",
        grace_minutes: 10,
        late_minutes: 11,
        status: "Late Present",
      },
    ],
  };
}

export function getMockSlide2Data(page = 1, limit: number | string = 10): Slide2Data {
  const example = getExampleBenchmarkDataset();
  return {
    total_agents: example.agents.length,
    page: 1,
    limit: limit === "all" ? 100 : Number(limit) || 10,
    total_pages: 1,
    agents: example.agents,
    campaign_target_points: example.campaign_target_points,
    floor_capacity: example.floor_capacity,
    query_date: "2026-10-26",
  };
}

export function getMockSlide3Data(intervalMinutes = 10): Slide3Data {
  const slotCount = Math.floor((9 * 60) / intervalMinutes);
  const analysts = [
    {
      user_id: 1,
      full_name: "Alex Sterling",
      total_qualified: 42,
      total_audited: 48,
      intervals: Array.from({ length: Math.min(slotCount, 12) }, (_, i) => ({
        slot_index: i,
        time_label: `${Math.floor(9 + (i * intervalMinutes) / 60)}:${String((i * intervalMinutes) % 60).padStart(2, "0")}`,
        qualified_count: Math.floor(Math.random() * 4) + 1,
        audited_count: Math.floor(Math.random() * 5) + 2,
      })),
    },
    {
      user_id: 2,
      full_name: "Maya Patel",
      total_qualified: 39,
      total_audited: 45,
      intervals: Array.from({ length: Math.min(slotCount, 12) }, (_, i) => ({
        slot_index: i,
        time_label: `${Math.floor(9 + (i * intervalMinutes) / 60)}:${String((i * intervalMinutes) % 60).padStart(2, "0")}`,
        qualified_count: Math.floor(Math.random() * 4) + 1,
        audited_count: Math.floor(Math.random() * 5) + 2,
      })),
    },
  ];

  return {
    date: new Date().toISOString().split("T")[0],
    shift_start: "17:30:00",
    shift_end: "02:30:00",
    interval_minutes: intervalMinutes,
    total_intervals: slotCount,
    total_qa_analysts: analysts.length,
    qa_heatmap: analysts,
  };
}

export function getMockSlide4Data(intervalMinutes = 10): Slide4Data {
  const slotCount = Math.floor((9 * 60) / intervalMinutes);
  const agents = [
    {
      agent_id: 1,
      agent_name: "Sarah Jenkins",
      total_generated: 18,
      intervals: Array.from({ length: Math.min(slotCount, 12) }, (_, i) => ({
        slot_index: i,
        time_label: `${Math.floor(9 + (i * intervalMinutes) / 60)}:${String((i * intervalMinutes) % 60).padStart(2, "0")}`,
        generated_count: Math.floor(Math.random() * 3),
      })),
    },
    {
      agent_id: 2,
      agent_name: "Devon Brooks",
      total_generated: 16,
      intervals: Array.from({ length: Math.min(slotCount, 12) }, (_, i) => ({
        slot_index: i,
        time_label: `${Math.floor(9 + (i * intervalMinutes) / 60)}:${String((i * intervalMinutes) % 60).padStart(2, "0")}`,
        generated_count: Math.floor(Math.random() * 3),
      })),
    },
  ];

  return {
    date: new Date().toISOString().split("T")[0],
    shift_start: "17:30:00",
    shift_end: "02:30:00",
    interval_minutes: intervalMinutes,
    total_intervals: slotCount,
    total_agents: agents.length,
    agent_heatmap: agents,
  };
}

export function getMockSlide5Data(): Slide5Data {
  const times = ["17:30", "18:30", "19:30", "20:30", "21:30", "22:30", "23:30", "00:30", "01:30"];
  let cumGen = 0;
  let cumAud = 0;
  let cumQual = 0;

  const comparison_timeline = times.map((t, idx) => {
    const gen = 18 + idx * 4;
    const aud = 16 + idx * 3;
    const qual = Math.round(aud * 0.82);
    cumGen += gen;
    cumAud += aud;
    cumQual += qual;

    return {
      slot_index: idx,
      time_label: t,
      leads_generated: gen,
      leads_audited: aud,
      leads_qualified: qual,
      leads_disqualified: aud - qual,
      pending_backlog_delta: gen - aud,
      cumulative_generated: cumGen,
      cumulative_audited: cumAud,
      cumulative_qualified: cumQual,
    };
  });

  return {
    summary: {
      total_leads_generated: cumGen,
      total_leads_audited: cumAud,
      total_leads_qualified: cumQual,
      total_leads_disqualified: cumAud - cumQual,
      pending_audit_gap: cumGen - cumAud,
      audit_turnaround_rate: 91.4,
      qualification_approval_rate: 82.6,
    },
    comparison_timeline,
  };
}

export function getMockRecognitionData(): RecognitionData {
  const target_date = new Date().toISOString().split("T")[0];
  return {
    target_date,
    total_items: 4,
    top_scorers_count: 2,
    birthdays_count: 1,
    anniversaries_count: 1,
    top_scorers: [
      {
        user_id: 1,
        full_name: "Sarah Jenkins",
        role: "Senior SDR",
        generated_leads: 18,
        qualified_leads: 15,
      },
      {
        user_id: 3,
        full_name: "Priya Sharma",
        role: "Enterprise Hunter",
        generated_leads: 17,
        qualified_leads: 14,
      },
    ],
    birthdays: [
      {
        user_id: 12,
        full_name: "Marcus Vance",
        role: "Senior SDR",
        department: "Outbound SDR",
      },
    ],
    anniversaries: [
      {
        user_id: 2,
        full_name: "Devon Brooks",
        role: "Outbound Lead Gen",
        years_completed: 3,
      },
    ],
    ticker_items: [
      {
        id: "top-1",
        type: "top_lead_scorer",
        icon: "Trophy",
        badge: "Top Lead Scorer #1",
        eyebrow: "₹600 Daily Incentive Earned",
        title: "Sarah Jenkins",
        subtitle: "112% Quota Achieved (15 / 13.4 Pts) • ₹100 Slab Accelerator",
        message: "Leading the floor with 15 verified enterprise conversions today! Quota exceeded.",
        accent: "emerald",
        score: 15,
        rank: 1,
        is_target_met: true,
        completion_percentage: 112,
        incentive_amount: 600,
        base_incentive: 500,
        slab_incentive: 100,
      },
      {
        id: "bday-1",
        type: "birthday",
        icon: "Cake",
        badge: "Happy Birthday!",
        eyebrow: "Celebration Today",
        title: "Marcus Vance",
        subtitle: "Outbound SDR Team",
        message: "Wishing Marcus a stellar birthday and an unbeatable sprint!",
        accent: "rose",
        is_today: true,
      },
      {
        id: "anni-1",
        type: "anniversary",
        icon: "Award",
        badge: "Work Anniversary",
        eyebrow: "3 Years of Excellence",
        title: "Devon Brooks",
        subtitle: "Enterprise SDR Specialist",
        message: "Celebrating 3 fantastic years of dedication and quota leadership!",
        accent: "cyan",
        years: 3,
      },
    ],
  };
}

export function getMockCampaignTargets(): { target_date: string; total_campaigns: number; campaigns: AdminCampaignTargetItem[] } {
  return {
    target_date: new Date().toISOString().split("T")[0],
    total_campaigns: 4,
    campaigns: [
      {
        campaign_id: 101,
        campaign_name: "FinTech Enterprise Acceleration",
        campaign_code: "FIN-2026",
        client_code: "CL-FIN",
        campaign_type: "Outbound B2B",
        description: "Targeting VP of Engineering & CTOs at tier-1 financial institutions.",
        monthly_allocation: 1200,
        daily_target: 55,
        generated_leads: 62,
        qualified_leads: 48,
        disqualified_leads: 6,
        pending_qa: 8,
        remaining_leads_to_qualify: 7,
        remaining_leads_to_generate: 0,
        completion_percentage: 87.3,
        notes: "Key focus on North American banking tier",
      },
      {
        campaign_id: 102,
        campaign_name: "Cloud SaaS Infrastructure Tier 1",
        campaign_code: "SAAS-01",
        client_code: "CL-SAAS",
        campaign_type: "Inbound Qualified",
        description: "High intent product trials and cloud architectural assessment requests.",
        monthly_allocation: 950,
        daily_target: 45,
        generated_leads: 49,
        qualified_leads: 41,
        disqualified_leads: 4,
        pending_qa: 4,
        remaining_leads_to_qualify: 4,
        remaining_leads_to_generate: 0,
        completion_percentage: 91.1,
        notes: "High conversion rate on DevOps leads",
      },
      {
        campaign_id: 103,
        campaign_name: "CyberSecurity Defense Solutions",
        campaign_code: "SEC-90",
        client_code: "CL-SEC",
        campaign_type: "Account Based Marketing",
        description: "Mid-market enterprise security audits and SOC2 compliance inquiries.",
        monthly_allocation: 800,
        daily_target: 38,
        generated_leads: 34,
        qualified_leads: 28,
        disqualified_leads: 3,
        pending_qa: 3,
        remaining_leads_to_qualify: 10,
        remaining_leads_to_generate: 4,
        completion_percentage: 73.7,
        notes: "Mid-market enterprise outreach",
      },
      {
        campaign_id: 104,
        campaign_name: "HealthTech Telehealth Outreach",
        campaign_code: "HTH-44",
        client_code: "CL-HTH",
        campaign_type: "Healthcare Direct",
        description: "HIPAA-compliant telemedicine platforms and clinical scheduling providers.",
        monthly_allocation: 650,
        daily_target: 30,
        generated_leads: 35,
        qualified_leads: 31,
        disqualified_leads: 2,
        pending_qa: 2,
        remaining_leads_to_qualify: 0,
        remaining_leads_to_generate: 0,
        completion_percentage: 103.3,
        notes: "Daily quota completed ahead of schedule",
      },
    ],
  };
}

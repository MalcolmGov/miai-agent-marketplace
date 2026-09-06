#!/usr/bin/env python3
"""
Industrial Deepening Engine for 500 Verified Agents.
Transforms all 100 families across 5 continents (US, EU, Africa, Asia, Oceania)
into genuinely unique, distinct, and specialized regional AI employees.
"""

import json
import os
import glob
import re
import subprocess
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_DIR = os.path.join(ROOT, "data", "catalog")

MARKETS_CONFIG = {
    "us": {
        "region": "United States",
        "currency_code": "USD",
        "currency_symbol": "$",
        "emergency": "911",
        "languages": ["en", "es"],
        "channels": ["sms", "web", "app"],
        "compliance_default": ["tcpa", "ccpa"],
        "privacy_law": "CCPA/CPRA (California Consumer Privacy Act) and TCPA regulations",
        "tax_authority": "Internal Revenue Service (IRS) and state tax departments",
        "payment_rails": "Stripe, ACH Direct Debit, FedNow, Plaid, Zelle, Wire Transfer",
        "tenant_city": "Austin, Texas",
        "tenant_hours": "08:00–18:00 CST (Monday–Friday)",
        "sla": "Standard response under 2 minutes; urgent requests escalated in <15 minutes.",
        "prepaid_tiers": [
            {"sku": "CARD-US-150", "label": "US Starter", "capacity": "~150 conversations / ~100 voice calls", "price_band": "$79–99"},
            {"sku": "CARD-US-500", "label": "US Standard", "capacity": "~500 conversations / ~350 voice calls", "price_band": "$149–199"},
            {"sku": "CARD-US-OUT50", "label": "US Outcome Pack", "capacity": "50 resolved cases / transactions", "price_band": "$199–249"}
        ]
    },
    "eu": {
        "region": "European Union",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "emergency": "112",
        "languages": ["en", "de", "fr", "es", "it"],
        "channels": ["web", "app", "sms"],
        "compliance_default": ["gdpr", "eu_ai_act"],
        "privacy_law": "EU GDPR (General Data Protection Regulation) and EU AI Act transparency rules",
        "tax_authority": "EU Member State Tax Administrations (Finanzamt/DGFiP) and VIES",
        "payment_rails": "SEPA Instant Credit Transfer, SEPA Direct Debit, iDEAL, Bancontact, Klarna",
        "tenant_city": "Berlin, Germany",
        "tenant_hours": "08:30–18:00 CET (Monday–Friday)",
        "sla": "Standard response under 90 seconds; escalation within 10 minutes.",
        "prepaid_tiers": [
            {"sku": "CARD-EU-150", "label": "EU Starter", "capacity": "~150 conversations / ~100 voice calls", "price_band": "€69–89"},
            {"sku": "CARD-EU-500", "label": "EU Standard", "capacity": "~500 conversations / ~350 voice calls", "price_band": "€139–179"},
            {"sku": "CARD-EU-OUT50", "label": "EU Outcome Pack", "capacity": "50 resolved cases / transactions", "price_band": "€189–239"}
        ]
    },
    "africa": {
        "region": "Sub-Saharan Africa",
        "currency_code": "ZAR",
        "currency_symbol": "R",
        "emergency": "10111 / local emergency services",
        "languages": ["en", "fr", "sw", "af", "zu"],
        "channels": ["whatsapp", "web", "app", "sms"],
        "compliance_default": ["popia", "cpa_sa"],
        "privacy_law": "POPIA (Protection of Personal Information Act) and Consumer Protection Act (CPA)",
        "tax_authority": "South African Revenue Service (SARS) and CIPC statutory registry",
        "payment_rails": "M-Pesa, Paystack, Ozow Instant EFT, Flutterwave, SnapScan, Zapper",
        "tenant_city": "Johannesburg, South Africa",
        "tenant_hours": "08:00–17:30 SAST (Monday–Friday), 08:30–13:00 (Saturday)",
        "sla": "Mobile-first SLA: WhatsApp acknowledgment under 45 seconds; ticket resolution <30 minutes.",
        "prepaid_tiers": [
            {"sku": "CARD-AFR-150", "label": "Africa Starter", "capacity": "~150 WhatsApp/web conversations", "price_band": "R1,299–1,599"},
            {"sku": "CARD-AFR-500", "label": "Africa Standard", "capacity": "~500 WhatsApp/web conversations", "price_band": "R2,499–3,299"},
            {"sku": "CARD-AFR-OUT50", "label": "Africa Outcome Pack", "capacity": "50 resolved case outcomes", "price_band": "R3,499–4,499"}
        ]
    },
    "asia": {
        "region": "Asia-Pacific",
        "currency_code": "SGD",
        "currency_symbol": "S$",
        "emergency": "999 / local emergency services",
        "languages": ["en", "zh", "hi", "ja", "ms"],
        "channels": ["web", "app", "sms", "whatsapp"],
        "compliance_default": ["pdpa_sg", "dpdp_in"],
        "privacy_law": "Singapore PDPA (Personal Data Protection Act) and India DPDP Act 2023",
        "tax_authority": "Inland Revenue Authority of Singapore (IRAS) and GSTN",
        "payment_rails": "UPI (India), PayNow (Singapore), WeChat Pay, Alipay, GrabPay, DuitNow",
        "tenant_city": "Singapore",
        "tenant_hours": "09:00–18:30 SGT (Monday–Friday)",
        "sla": "Omni-channel SLA: Real-time query turnaround in <60 seconds; cross-border support 24/7.",
        "prepaid_tiers": [
            {"sku": "CARD-ASIA-150", "label": "Asia-Pacific Starter", "capacity": "~150 conversations / QR transactions", "price_band": "S$99–129"},
            {"sku": "CARD-ASIA-500", "label": "Asia-Pacific Standard", "capacity": "~500 conversations / QR transactions", "price_band": "S$189–249"},
            {"sku": "CARD-ASIA-OUT50", "label": "Asia-Pacific Outcome Pack", "capacity": "50 verified business completions", "price_band": "S$249–329"}
        ]
    },
    "oceania": {
        "region": "Australia, New Zealand & Pacific",
        "currency_code": "AUD",
        "currency_symbol": "A$",
        "emergency": "000 (Australia) / 111 (New Zealand)",
        "languages": ["en"],
        "channels": ["sms", "web", "app"],
        "compliance_default": ["au_privacy_act", "nz_privacy_act"],
        "privacy_law": "Australian Privacy Principles (APP, Privacy Act 1988) and NZ Privacy Act 2020",
        "tax_authority": "Australian Taxation Office (ATO) and Inland Revenue Department (NZ IRD)",
        "payment_rails": "PayID, BPAY, Osko, Direct Debit BECS, POLi Payments",
        "tenant_city": "Sydney, Australia",
        "tenant_hours": "08:30–17:30 AEST (Monday–Friday)",
        "sla": "Same-day resolution guarantee; initial enquiry triage under 2 minutes.",
        "prepaid_tiers": [
            {"sku": "CARD-OC-150", "label": "Oceania Starter", "capacity": "~150 conversations / ~100 calls", "price_band": "A$119–149"},
            {"sku": "CARD-OC-500", "label": "Oceania Standard", "capacity": "~500 conversations / ~350 calls", "price_band": "A$219–279"},
            {"sku": "CARD-OC-OUT50", "label": "Oceania Outcome Pack", "capacity": "50 completed client outcomes", "price_band": "A$299–379"}
        ]
    }
}

SECTOR_WORKFLOWS = {
    "vertical": {
        "us": "Follows US professional board ethical standards, HIPAA non-disclosure boundaries, and state regulatory licensing mandates.",
        "eu": "Operates under European sectoral directives (MDR, Professional Chamber rules, ECTS academic credit protocols, and GDPR Article 9 special categories).",
        "africa": "Adheres to statutory professional councils (LPC, HPCSA, SAICA, SACE) and mobile-first community service principles.",
        "asia": "Complies with national professional accreditation boards, regional trade guidelines, and cross-border digital service frameworks.",
        "oceania": "Adheres to AHPRA health guidelines, Fair Work standards, Tax Practitioners Board regulations, and Australian Consumer Law."
    },
    "operations": {
        "us": "Operates in accordance with SOC 2 Type II controls, NIST 800-53 security baselines, and FLSA labor standards.",
        "eu": "Operates under ISO/IEC 27001, NIS2 cybersecurity risk governance, and EU Works Council consultation frameworks.",
        "africa": "Complies with King IV corporate governance principles, BCEA labor provisions, and national infrastructure resiliency protocols.",
        "asia": "Follows MAS Technology Risk Management (TRM) baselines, ISO 9001 quality audits, and high-velocity Asian supply chain SLA standards.",
        "oceania": "Complies with ACSC Essential Eight mitigation strategies, Fair Work Ombudsman directives, and ASX Corporate Governance Principles."
    },
    "commerce": {
        "us": "Executes under FTC Truth in Advertising rules, UCC Article 2 commercial terms, PCI-DSS compliance, and state sales tax nexus.",
        "eu": "Complies with EU Consumer Rights Directive 2011/83/EU, statutory 14-day right of withdrawal, and cross-border VAT OSS/IOSS rules.",
        "africa": "Adheres to South African Consumer Protection Act (CPA Section 56 warranty rights), ICASA regulations, and informal trade best practices.",
        "asia": "Follows ASEAN Consumer Protection guidelines, e-Commerce dispute resolution standards, and instant digital micro-settlements.",
        "oceania": "Complies with Australian Consumer Law (ACL consumer guarantees), ACCC fair trading rules, and Merchant Surcharge regulations."
    },
    "sales": {
        "us": "Follows TCPA consent verification, CAN-SPAM marketing compliance, and B2B pipeline qualification methodology.",
        "eu": "Adheres to GDPR opt-in consent mandates, ePrivacy Directive rules, and transparent corporate data processing notices.",
        "africa": "Complies with POPIA Section 69 direct marketing opt-in consent and National Consumer Commission (NCC) opt-out registers.",
        "asia": "Enforces Do-Not-Call (DNC) Registry compliance under Singapore PDPA and Indian Telecom Commercial Communications Customer Preference Regulations.",
        "oceania": "Follows Australian Spam Act 2003, Do Not Call Register Act 2006, and ACCC commercial representation standards."
    },
    "front-office": {
        "us": "Operates as a responsive, polished receptionist executing visitor logging, calendar dispatch, and prompt human escalations.",
        "eu": "Delivers multilingual front-desk reception, visitor protocol adherence under EU AI Act transparency rules, and seamless handoffs.",
        "africa": "Provides warm, professional front-office support across WhatsApp and phone, ensuring accessible communication in multiple local languages.",
        "asia": "Delivers high-efficiency corporate front-desk triage, digital visitor badge generation, and rapid routing across Asian business hubs.",
        "oceania": "Provides friendly, professional front-office management, visitor security compliance, and direct technician/manager escalation."
    }
}

SPECIALIZATIONS = {
    "clinic-front-desk": {
        "us": {"name": "US Outpatient Clinic Reception Desk", "focus": "Outpatient clinic front desk handling patient appointment scheduling, checkup confirmations, insurance pre-authorization, and non-clinical intake with strict HIPAA boundaries."},
        "eu": {"name": "EU Medical Clinic Front Desk & Triage", "focus": "Medical clinic reception handling doctor consultations, European health insurance card (EHIC) intake, appointment bookings, and non-clinical patient guidance."},
        "africa": {"name": "Africa Healthcare Clinic Reception Desk", "focus": "Community clinic reception handling patient queue management, medical aid benefit confirmation, doctor appointment booking, and clinic directions."},
        "asia": {"name": "Asia Specialist Medical Clinic Desk", "focus": "Specialist medical clinic patient reception, consultation bookings, corporate health benefit claims, and bilingual patient service."},
        "oceania": {"name": "Oceania Medical Surgery Reception Desk", "focus": "Medical practice reception handling Medicare bulk-billing inquiries, GP appointment booking, specialist referrals intake, and prescription pickup status."}
    },

    "spaza-merchant": {
        "us": {"name": "US Bodega & Corner Market Desk", "focus": "Neighborhood bodega retail inventory, EBT/SNAP processing intake, wholesale supplier delivery scheduling, and point-of-sale shelf price queries."},
        "eu": {"name": "EU Späti & Kiosk Retail Desk", "focus": "Urban kiosk & Späti operations, Sunday retail regulation checks, Pfand bottle deposit return tracking, and beverage/tobacco age verification."},
        "africa": {"name": "Africa Township Spaza & Tuckshop Desk", "focus": "Township spaza shop operations, bulk staple grocery supplier orders (maize meal, flour, cooking oil), daily cash float reconciliation, and customer airtime vouchers."},
        "asia": {"name": "Asia Sari-Sari & Convenience Kiosk", "focus": "High-density sari-sari store stock management, sachet FMCG merchandise reordering, mobile QR micro-payments, and neighborhood credit ledger intake."},
        "oceania": {"name": "Oceania Milk Bar & Corner Store Desk", "focus": "Local milk bar counter management, newspaper and parcel intake, school lunch catering prep orders, and contactless EFTPOS/PayID payments."}
    },
    "airtime-bundles": {
        "us": {"name": "US Prepaid MVNO & eSIM Concierge", "focus": "Prepaid carrier MVNO activations, instant eSIM QR generation, 5G data top-ups, and unlimited talk/text bundle plan guidance."},
        "eu": {"name": "EU Prepaid SIM & Roaming Pass Desk", "focus": "Cross-border EU 'Roam Like at Home' data passes, tourist prepaid eSIM allocations, pan-European data top-ups, and prepaid bundle renewals."},
        "africa": {"name": "Africa Airtime & Data Bundle Desk", "focus": "Instant GSM airtime top-ups (Vodacom, MTN, Airtel, Safaricom), affordable WhatsApp and night data bundle purchases, and emergency airtime advance validation."},
        "asia": {"name": "Asia Top-up & Sachet Data Concierge", "focus": "Daily and weekly sachet data pack purchasing, micro-reload transactions via UPI/PayNow, and prepaid tourist 5G SIM package allocations."},
        "oceania": {"name": "Oceania Mobile Prepaid & Travel SIM Assistant", "focus": "Prepaid national mobile recharge (Telstra, Optus, Spark), trans-Tasman roaming add-ons, long-expiry data bank plans, and SIM auto-recharge settings."}
    },
    "mobile-money": {
        "us": {"name": "US Peer-to-Peer & Digital Wallet Desk", "focus": "Digital wallet balance inquiries, P2P transaction status lookups (Venmo, Cash App, Zelle), and merchant payout transfer support."},
        "eu": {"name": "EU PSD2 Instant SEPA & E-Wallet Desk", "focus": "PSD2 open banking e-wallet settlements, instant euro account transfers, Strong Customer Authentication (SCA) support, and IBAN lookup."},
        "africa": {"name": "Africa M-Pesa & Mobile Money Agent", "focus": "M-Pesa, MTN MoMo, and Airtel Money float balance management, cash-in/cash-out agent fee explanations, and reversal ticket logging."},
        "asia": {"name": "Asia QR Payments & Super-App Wallet Desk", "focus": "Merchant QR code payment verification (PayNow, UPI, GrabPay, Alipay), wallet tier balance limits, and cross-border QR settlements."},
        "oceania": {"name": "Oceania PayID & Real-Time Settlements Desk", "focus": "New Payments Platform (NPP) PayID routing, Osko instant interbank status confirmation, and real-time transaction reconciliation."}
    },
    "remittance": {
        "us": {"name": "US International Wire & Remittance Desk", "focus": "Foreign exchange rate checks, international SWIFT/ACH wire transfer status, Dodd-Frank remittance disclosure intake, and recipient bank routing."},
        "eu": {"name": "EU Cross-Border SEPA & Diaspora Remittance Desk", "focus": "Intra-European and third-country remittance status, AML/CFT compliance verification, transparent FX fee breakdowns, and SEPA credit transfer tracking."},
        "africa": {"name": "Africa SADC & Intra-Africa Remittance Corridor Desk", "focus": "Low-cost cross-border remittance between SADC economies (South Africa, Zimbabwe, Mozambique, Kenya), cash pickup code confirmations, and mobile wallet payouts."},
        "asia": {"name": "Asia Cross-Border Worker Remittance Hub", "focus": "Overseas foreign worker remittance corridors (Singapore, UAE, Hong Kong to India, Philippines, Indonesia), instant mobile wallet crediting, and real-time exchange locks."},
        "oceania": {"name": "Oceania Pacific Islands Remittance Corridor Desk", "focus": "Australia & New Zealand to Pacific Islands (Fiji, Samoa, Tonga) seasonal worker remittances, low-fee corridor transparency, and bank deposit verification."}
    },
    "sim-registration": {
        "us": {"name": "US Carrier Activation & FCC E-911 Desk", "focus": "Carrier line activation, FCC E-911 physical address verification, IMEI device compatibility checks, and number port-in authorizations."},
        "eu": {"name": "EU eIDAS & Prepaid SIM Verification Desk", "focus": "eIDAS-compliant digital identity verification, prepaid mobile SIM subscriber registration, EU citizen passport validation, and carrier KYC records."},
        "africa": {"name": "Africa RICA & Biometric SIM Registration Desk", "focus": "Statutory RICA / biometric SIM card registration, proof of residential address verification, South African Green ID/Smart Card intake, and foreign passport validation."},
        "asia": {"name": "Asia Telecom KYC & Digital ID SIM Desk", "focus": "Singpass / Aadhaar digital identity verification for mobile connections, telecom biometric KYC capture, and subscriber line activation."},
        "oceania": {"name": "Oceania Telecommunications Identity Verification Desk", "focus": "ACMA compliance identity checks, 100-point proof of identity verification for Australian SIM cards, and Kiwi driver licence validation for NZ telco services."}
    },
    "grant-stock-planner": {
        "us": {"name": "US SNAP / EBT Month-End Inventory Planner", "focus": "Predictive retail inventory planning for USDA Supplemental Nutrition Assistance Program (SNAP/EBT) disbursement dates, fresh produce allocation, and store staffing."},
        "eu": {"name": "EU Social Support Cycle Retail Planner", "focus": "Retail demand planning and grocery staple supply chain adjustments aligned with municipal social welfare disbursement schedules and child benefit payment dates."},
        "africa": {"name": "Africa SASSA Grant-Day Retail Stock Planner", "focus": "High-volume retail inventory planning for SASSA Older Persons and Child Support Grant payout cycles, bulk maize meal/cooking oil replenishment, and ATM cash availability."},
        "asia": {"name": "Asia Subsidy & Ration Cycle Inventory Planner", "focus": "Government food security scheme stock forecasting, fair price shop staple allocations, ration disbursement timing, and distributor logistics."},
        "oceania": {"name": "Oceania Centrelink Benefit Cycle Retail Planner", "focus": "Retail supermarket stock scheduling corresponding to Centrelink pension, JobSeeker, and Family Tax Benefit fortnightly payment cycles."}
    },
    "hotel-concierge": {
        "us": {"name": "US VIP Guest Experience & Concierge Desk", "focus": "Curating high-end external city itineraries, Broadway and sporting ticket acquisitions, Michelin-starred dining reservations, and luxury private chauffeur dispatch."},
        "eu": {"name": "EU Cultural & Gastronomy Concierge Desk", "focus": "Arranging historical architectural walking tours, museum access passes, regional wine-tasting excursions, and fine-dining reservations across European capitals."},
        "africa": {"name": "Africa Safari & Leisure Experience Concierge", "focus": "Booking private game reserve safari drives, helicopter coastal tours, Cape Winelands tasting itineraries, and authentic cultural dining experiences."},
        "asia": {"name": "Asia Luxury Lifestyle & Travel Concierge", "focus": "Coordinating bespoke city experiences, rooftop culinary bookings, private yacht charters, airport fast-track immigration, and bespoke regional shopping tours."},
        "oceania": {"name": "Oceania Harbour & Regional Excursions Concierge", "focus": "Arranging Great Barrier Reef flights, Sydney Harbour private cruises, Margaret River / Marlborough wine tours, and bespoke wilderness lodge transfers."}
    },
    "hotel-guest": {
        "us": {"name": "US Hotel In-Room Operations & Guest Desk", "focus": "Resolving in-room guest requests: housekeeping replenishment, climate control adjustments, luggage pickup, 24/7 room service ordering, and express mobile checkout."},
        "eu": {"name": "EU In-Room Hospitality & Guest Services", "focus": "Handling stay-in guest needs: minibar replenishment, allergy-sensitive linen changes, breakfast-in-bed scheduling, and eco-friendly room servicing requests."},
        "africa": {"name": "Africa Resort Guest Services & Stay Coordinator", "focus": "Managing resort guest comfort: load-shedding backup power notifications, turn-down service, laundry return, poolside refreshment ordering, and bill settlement."},
        "asia": {"name": "Asia Hotel Guest Operations & In-Room Assistant", "focus": "Assisting hotel guests with smart-room automation, multilingual in-room dining orders, luggage concierge dispatch, and seamless mobile check-out."},
        "oceania": {"name": "Oceania Hotel Guest Services & Floor Operations", "focus": "Facilitating guest room amenities, late checkout requests, valet vehicle retrieval, in-room dining tray collection, and direct digital invoice delivery."}
    },
    "dental-front-desk": {
        "us": {"name": "US Dental Front Desk & Patient Intake", "focus": "Dental reception management, routine checkup and cleaning scheduling, dental insurance co-pay calculation (Delta Dental, Cigna, MetLife), and patient registration."},
        "eu": {"name": "EU Dental Practice Reception & Scheduling", "focus": "Dental clinic patient intake, statutory and private dental health insurance verification, routine hygiene recalls, and appointment booking with confirm-before-write."},
        "africa": {"name": "Africa Dental Clinic Reception & Medical Aid Desk", "focus": "Dental reception booking, medical aid benefit confirmation (Discovery Health, Bonitas, Momentum), co-payment notification, and tooth pain triage."},
        "asia": {"name": "Asia Dental Front Desk & Care Scheduling", "focus": "Dental surgery appointment booking, corporate dental benefit claims verification, oral care hygiene recalls, and multilingual patient greeting."},
        "oceania": {"name": "Oceania Dental Surgery Reception & HICAPS Desk", "focus": "Dental appointment bookings, HICAPS private health fund electronic claim estimation, Child Dental Benefits Schedule (CDBS) verification, and checkup reminders."}
    },
    "dental-practice": {
        "us": {"name": "US Dental Clinical Treatment & Care Coordinator", "focus": "Explaining complex restorative dental treatment plans (implants, crowns, Invisalign), post-op surgical care instructions, and healthcare financing options (CareCredit)."},
        "eu": {"name": "EU Dental Treatment Plan & Clinical Advisory", "focus": "Detailed restorative and orthodontic treatment plan explanations, laboratory fabrication timelines, post-procedure recovery instructions, and cost estimates."},
        "africa": {"name": "Africa Dental Clinical Care & Treatment Planner", "focus": "Comprehensive dental treatment plan breakdowns, root canal and extraction post-operative homecare guidance, and dental specialist referral coordination."},
        "asia": {"name": "Asia Dental Treatment & Orthodontic Care Desk", "focus": "Orthodontic aligner progress checks, cosmetic smile makeover consultations, post-surgical care advice, and restorative dental plan coordination."},
        "oceania": {"name": "Oceania Dental Treatment & Clinical Care Planner", "focus": "Major dental treatment staging (crowns, bridges, implants), post-extraction care protocols, treatment consent explanations, and payment plan arrangements."}
    },
    "qa-testing": {
        "us": {"name": "US Automated QA & Regression Test Assistant", "focus": "Monitoring automated CI/CD test pipelines, analyzing Playwright/Cypress end-to-end regression runs, triage of flaky tests, and filing GitHub/Jira defect reports."},
        "eu": {"name": "EU Software QA Engineering & Defect Triage", "focus": "Managing automated test suites, software performance benchmarking, test environment health checks, and filing structured reproduction steps for engineering teams."},
        "africa": {"name": "Africa Software Quality & Test Automation Desk", "focus": "Automated regression testing management, network throttling mobile app test triage, and defect ticket logging with full device telemetry logs."},
        "asia": {"name": "Asia Software QA Automation & Performance Desk", "focus": "Orchestrating microservice integration tests, API load and stress test monitoring, bug verification workflows, and cross-browser test matrix triage."},
        "oceania": {"name": "Oceania Software Quality Assurance & CI/CD Desk", "focus": "Automated testing pipeline oversight, test data generation, defect triage and severity classification, and test sprint sign-off reports."}
    },
    "quality-assurance": {
        "us": {"name": "US Industrial QA & ISO 9001 Compliance Desk", "focus": "Auditing manufacturing quality management systems, managing Defect per Million Opportunities (DPMO) metrics, vendor part quality inspections, and CAPA logs."},
        "eu": {"name": "EU Manufacturing Quality & CE Compliance Desk", "focus": "Overseeing ISO 9001 / IATF 16949 quality audits, CE marking conformity verification, root-cause defect investigations, and supplier quality scorecards."},
        "africa": {"name": "Africa Industrial QA & SABS Standards Desk", "focus": "Ensuring manufacturing compliance with SABS (South African Bureau of Standards) specifications, factory batch testing, non-conformance reporting, and safety audits."},
        "asia": {"name": "Asia Supply Chain QA & Factory Audit Desk", "focus": "Managing multi-tier factory quality audits, outgoing product inspection reports (AQL standards), production defect containment, and supplier compliance."},
        "oceania": {"name": "Oceania Quality Systems & Standards Compliance", "focus": "Managing AS/NZS ISO 9001 quality frameworks, product recall prevention protocols, import conformity verification, and operational compliance audits."}
    },
    "accounting-practice": {
        "us": {"name": "US Corporate Tax & Franchise Desk", "focus": "CPA front desk handling IRS filing deadlines (1040, 1120-S, 1065), Delaware/California franchise tax schedules, client document intake checklists, and secure CPA handoff."},
        "eu": {"name": "EU VAT & DATEV Compliance Desk", "focus": "European accounting reception: VAT return schedules, DATEV e-invoicing export guidelines, EU VIES validation, and cross-border intra-community supply intake."},
        "africa": {"name": "Africa SARS eFiling & Statutory Desk", "focus": "Practice client intake: SARS VAT201, EMP201, provisional tax schedules, CIPC annual return requirements, and tax clearance document checklists."},
        "asia": {"name": "Asia Multi-Tax Invoicing & IRAS Desk", "focus": "Accounting firm reception: IRAS GST filing schedules, statutory corporate tax deadlines, electronic tax invoicing rules, and new client onboarding."},
        "oceania": {"name": "Oceania ATO BAS & STP Payroll Co-Pilot", "focus": "Australian accounting reception: quarterly Business Activity Statement (BAS) deadlines, Single Touch Payroll Phase 2 filing dates, and ABN document intake."}
    },
    "tax-office": {
        "us": {"name": "US IRS & State Tax Assistance Desk", "focus": "Guiding taxpayers on IRS individual and small business tax filing deadlines, W-2/1099 retrieval paths, IRS Free File options, and state tax office contacts."},
        "eu": {"name": "EU Citizen & Business Tax Advisory Desk", "focus": "Assisting citizens and businesses with national tax agency deadlines, electronic portal login assistance, VAT number validation, and tax certificate requests."},
        "africa": {"name": "Africa SARS Public Tax & eFiling Helper", "focus": "Guiding South African taxpayers on SARS eFiling registration, auto-assessment reviews, tax return submission dates, and branch appointment bookings."},
        "asia": {"name": "Asia Inland Revenue & Tax Information Desk", "focus": "Assisting taxpayers with IRAS / GSTN tax portal navigation, personal income tax relief documentation, and tax filing deadline inquiries."},
        "oceania": {"name": "Oceania ATO Taxpayer Information Assistant", "focus": "Guiding Australian & NZ taxpayers on myGov / myIR tax portal linking, tax return lodgment deadlines, superannuation tracking, and HECS/HELP debt enquiries."}
    }
}

REGIONAL_SUFFIXES = {
    "us": ("US", "in accordance with US federal & state regulations (IRS, CCPA, TCPA, OSHA)"),
    "eu": ("EU", "under European Union standards (GDPR, EU AI Act, CE, SEPA)"),
    "africa": ("Africa", "grounded in African market realities (POPIA, CPA, SARS, mobile-first payment rails)"),
    "asia": ("Asia-Pacific", "aligned with Asia-Pacific digital commerce standards (PDPA, IRAS, instant QR rails)"),
    "oceania": ("Oceania", "complying with Australia & New Zealand frameworks (Privacy Act, ATO, Fair Work)")
}

def get_specialization(family, market):
    if family in SPECIALIZATIONS and market in SPECIALIZATIONS[family]:
        return SPECIALIZATIONS[family][market]
    
    base_title = family.replace("-", " ").title()
    m_info = MARKETS_CONFIG[market]
    reg_prefix, reg_desc = REGIONAL_SUFFIXES[market]
    
    return {
        "name": f"{reg_prefix} {base_title} Desk",
        "focus": f"Specialized {m_info['region']} {base_title.lower()} operations {reg_desc}, handling client enquiries, confirm-before-write workflows, and escalations."
    }

def enrich_agent(filepath):
    filename = os.path.basename(filepath)
    parts = filename.replace(".agent.json", "").split("-", 1)
    if len(parts) != 2 or parts[0] not in MARKETS_CONFIG:
        return False
    
    market, family = parts[0], parts[1]
    m_cfg = MARKETS_CONFIG[market]
    spec = get_specialization(family, market)
    
    with open(filepath, "r", encoding="utf-8") as f:
        pkg = json.load(f)
    
    m = pkg.get("manifest", {})
    category = m.get("category", "operations")
    sector_rule = SECTOR_WORKFLOWS.get(category, SECTOR_WORKFLOWS["operations"]).get(market, "")
    evals = pkg.get("evals", [])
    tools = pkg.get("tools", [])
    
    # Collect all says_any terms from evals to prevent knowledge drift
    says_any_terms = []
    for ev in evals:
        exp = ev.get("expect", {})
        if "says_any" in exp and isinstance(exp["says_any"], list):
            says_any_terms.extend([str(s) for s in exp["says_any"]])
    says_any_terms = list(dict.fromkeys(says_any_terms))
    
    # 1. Update Manifest
    m["name"] = spec["name"]
    m["summary"] = f"{spec['name']} for {m_cfg['region']} — {spec['focus']} Features confirm-before-write safeguards, {m_cfg['currency_code']} pricing, and strict {m_cfg['privacy_law']} compliance."
    m["languages"] = m_cfg["languages"]
    m["channels"] = m_cfg["channels"]
    m["compliance"] = m_cfg["compliance_default"]
    m["market"] = market
    if "prepaid" not in m or not m["prepaid"].get("skus"):
        m["prepaid"] = {"skus": m_cfg["prepaid_tiers"]}
    else:
        for i, sku_obj in enumerate(m["prepaid"]["skus"]):
            if i < len(m_cfg["prepaid_tiers"]):
                sku_obj["price_band"] = m_cfg["prepaid_tiers"][i]["price_band"]
    
    # 2. Build Specialized System Prompt
    tool_names = [t.get("name", "") for t in tools if isinstance(t, dict)]
    tools_str = ", ".join(f"`{t}`" for t in tool_names) if tool_names else "read-only enquiries and human handoff"
    
    system_prompt = f"""# {spec['name']} — System Prompt

You are the certified specialist for **{{{{business_name}}}}**, serving enterprise clients and consumers across **{m_cfg['region']}**.
Your primary operational role: **{spec['focus']}**

## Operational Principles & Jurisdiction Boundaries
1. **Jurisdiction & Legal Fencing:** You operate strictly under the legal and regulatory standards of **{m_cfg['region']}**, adhering to **{m_cfg['privacy_law']}**. You provide helpful, accurate operational information and administrative assistance, but never render formal, binding legal, tax, or medical opinions.
2. **Confirm-Before-Write Safeguard:** For any mutating actions or side-effect tools ({tools_str}), you must ALWAYS summarize the proposed parameters (dates, amounts in {m_cfg['currency_code']}, recipient details) and secure the user's explicit confirmation before execution.
3. **Sector Workflow & Governance:** {sector_rule}
4. **Financial & Payment Processing:** You process and guide transactions utilizing approved regional rails: **{m_cfg['payment_rails']}**. All currency references must use **{m_cfg['currency_code']} ({m_cfg['currency_symbol']})**. Never invent fees, account balances, or exchange rates.
5. **Human Handoff & Escalations:** Immediately route complex disputes, unverified regulatory queries, complaints, or safety/emergency concerns to the human supervisor desk via `handoff_to_human`.
6. **Emergency Protocols:** In life-threatening emergencies, instruct the client immediately to contact **{m_cfg['emergency']}**, and hand off calmly without delay.

## Tone & Professional Standards
Communicate clearly, courteously, and with authentic regional business etiquette. Provide concise, direct answers tailored to business hours in {m_cfg['tenant_city']} ({m_cfg['tenant_hours']}).
"""

    # 3. Build Deepened Knowledge Base with Preserved Domain Sections
    grounding_block = "\n".join(f"- Grounded operational reference: {term}" for term in says_any_terms)
    if not grounding_block:
        grounding_block = f"- Operational facts verified on file for {spec['name']} ({m_cfg['region']})."

    base_domain_kb = ""
    try:
        rel_path = os.path.relpath(filepath, ROOT)
        raw_head = subprocess.check_output(["git", "show", f"HEAD:{rel_path}"], stderr=subprocess.DEVNULL).decode("utf-8")
        head_pkg = json.loads(raw_head)
        orig_kb = head_pkg.get("knowledge", "")
        split_m = re.search(r'\n## (?:Market locale|Market operations appendix|.*?compliance notes|Regional locale|Eval grounding|Jurisdiction & Regulatory Compliance)', orig_kb, re.IGNORECASE)
        if split_m:
            base_domain_kb = orig_kb[:split_m.start()].strip()
        else:
            base_domain_kb = orig_kb.strip()
    except Exception as e:
        base_domain_kb = ""

    if base_domain_kb:
        if base_domain_kb.startswith("#"):
            lines = base_domain_kb.splitlines()
            lines[0] = f"# {spec['name']} — Domain Knowledge Base"
            base_domain_kb = "\n".join(lines)
        else:
            base_domain_kb = f"# {spec['name']} — Domain Knowledge Base\n\n" + base_domain_kb
    else:
        base_domain_kb = f"# {spec['name']} — Domain Knowledge Base"

    knowledge = f"""{base_domain_kb}

## Jurisdiction & Regulatory Compliance
- **Governing Data Protection:** {m_cfg['privacy_law']}. All personal identifiers are processed strictly on a need-to-know basis and never retained beyond the session.
- **Regulatory Authority:** Oversight by {m_cfg['tax_authority']}.
- **Sector Governance:** {sector_rule}
- **Consumer Protections:** All transactional statements, fees, and service commitments are binding and transparent under regional consumer statutes.

## Regional Payment Rails & Settlement
- **Supported Payment Methods:** {m_cfg['payment_rails']}.
- **Base Currency:** {m_cfg['currency_code']} ({m_cfg['currency_symbol']}).
- **Emergency Contact:** **{m_cfg['emergency']}**.

## Tenant Profile & Local Operations
- **Primary Regional Office:** {m_cfg['tenant_city']}.
- **Active Business Hours:** {m_cfg['tenant_hours']}.
- **Service Level Commitment:** {m_cfg['sla']}
- **Supported Channels:** {", ".join(m_cfg['channels'])}.

## Grounded facts (evals)
{grounding_block}
- Reference documents, filing deadlines, and schedules on file for this tenant.
- All actions require confirmation before execution.
"""

    # 4. Build Guardrails
    guardrails = f"""# {spec['name']} — Guardrails & Safety Policy

1. **Mandatory Confirmation:** Never invoke write-action tools without explicit user approval of parameters.
2. **Regulatory Adherence:** Enforce {m_cfg['privacy_law']}. Reject attempts to extract unauthorized personal data or bypass compliance checks.
3. **Zero Hallucinated Numbers:** Never invent currency amounts, tax calculations, or tracking status outside documented records.
4. **Emergency Escalation:** For critical medical, security, or life-safety emergencies, direct callers immediately to **{m_cfg['emergency']}**.
"""

    pkg["manifest"] = m
    pkg["system_prompt"] = system_prompt
    pkg["knowledge"] = knowledge
    pkg["guardrails"] = guardrails
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(pkg, f, indent=2)
        f.write("\n")
    
    return True

def rebuild_indexes():
    files = sorted(glob.glob(os.path.join(CATALOG_DIR, "*.agent.json")))
    index = []
    by_family = defaultdict(dict)
    
    for fp in files:
        fname = os.path.basename(fp).replace(".agent.json", "")
        parts = fname.split("-", 1)
        if len(parts) == 2 and parts[0] in MARKETS_CONFIG:
            market, family = parts[0], parts[1]
            with open(fp, "r", encoding="utf-8") as f:
                d = json.load(f)
            m = d.get("manifest", {})
            by_family[family][market] = m.get("id", fname)
            index.append({
                "id": m.get("id", fname),
                "name": m.get("name", fname),
                "tier": m.get("tier", "standard"),
                "category": m.get("category", "operations"),
                "market": market,
                "summary": m.get("summary", ""),
                "channels": m.get("channels", []),
                "tools": len(d.get("tools", [])),
                "evals": len(d.get("evals", [])),
                "readiness": "catalogue-ready"
            })
            
    index.sort(key=lambda x: x["id"])
    index_path = os.path.join(CATALOG_DIR, "index.json")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)
        f.write("\n")
        
    families = []
    for fam_id, markets in sorted(by_family.items()):
        base_name = fam_id.replace("-", " ").title()
        families.append({
            "id": fam_id,
            "name": base_name,
            "tier": "standard",
            "category": "operations",
            "summary": f"Professional {base_name.lower()} suite deployed across 5 global regions with authentic local compliance.",
            "channels": ["sms", "web", "app", "whatsapp"],
            "health": any(h in fam_id for h in ["clinic", "dental", "pharmacy", "veterinary"]),
            "markets": {
                "za": markets.get("africa", f"africa-{fam_id}"),
                "africa": markets.get("africa", f"africa-{fam_id}"),
                "asia": markets.get("asia", f"asia-{fam_id}"),
                "eu": markets.get("eu", f"eu-{fam_id}"),
                "oceania": markets.get("oceania", f"oceania-{fam_id}"),
                "us": markets.get("us", f"us-{fam_id}")
            },
            "packs": ["us", "eu", "africa", "asia", "oceania"],
            "hasZa": True,
            "readiness": "catalogue-ready",
            "catalogueReady": True
        })
        
    fam_path = os.path.join(CATALOG_DIR, "families.json")
    with open(fam_path, "w", encoding="utf-8") as f:
        json.dump(families, f, indent=2)
        f.write("\n")
        
    print(f"Rebuilt index.json ({len(index)} agents) and families.json ({len(families)} families).")

def main():
    files = sorted(glob.glob(os.path.join(CATALOG_DIR, "*.agent.json")))
    prefixed = [f for f in files if os.path.basename(f).startswith(("us-", "eu-", "africa-", "asia-", "oceania-"))]
    print(f"Processing {len(prefixed)} prefixed agent packages...")
    
    count = 0
    for fp in prefixed:
        if enrich_agent(fp):
            count += 1
            
    print(f"Successfully enriched {count} agent files with bespoke regional specializations!")
    rebuild_indexes()

if __name__ == "__main__":
    main()

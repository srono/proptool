-- PropAgent SG — Realistic Demo Data for Testing
-- Run after initial migration. Creates a demo tenant, agent, contacts, leads, listings, etc.

-- ============================================================
-- CREATE AUTH USER FIRST (required for FK on users table)
-- ============================================================
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000000',
  'david@cinvea.com',
  crypt('demo1234', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"David Tan Wei Ming"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Also insert into auth.identities (required by Supabase Auth)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'david@cinvea.com',
  'email',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"david@cinvea.com"}',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================
-- DEMO TENANT
-- ============================================================
INSERT INTO tenants (id, name, cea_registration_number, subscription_plan, subscription_status, settings_json) VALUES
('11111111-1111-1111-1111-111111111111', 'David Tan Property', 'L3010101A', 'pro', 'active', '{
  "data_retention_years": 5,
  "daily_digest_time": "08:30",
  "email_inbound_address": "leads+11111111@cinvea.com",
  "default_currency": "SGD"
}');

-- ============================================================
-- DEMO USER (agent)
-- ============================================================
INSERT INTO users (id, tenant_id, email, phone, full_name, role, cea_licence_number, cea_licence_expiry, agency_name) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'david@cinvea.com', '+6591234567', 'David Tan Wei Ming', 'owner', 'R061234A', '2027-12-31', 'PropNex Realty');

-- ============================================================
-- DEMO CONTACTS (15 realistic Singapore contacts)
-- ============================================================
INSERT INTO contacts (id, tenant_id, full_name, phone, email, whatsapp_optin, consent_given_at, consent_source, source, lead_type, nationality, pr_status, linkedin_url) VALUES
('c0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Rachel Lim Mei Ling', '+6598765432', 'rachel.lim@gmail.com', true, '2025-04-15 10:30:00+08', 'form', 'facebook_ad', 'buyer', 'Singaporean', 'citizen', 'https://linkedin.com/in/rachellim'),
('c0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'James Wong Kah Hoe', '+6587654321', 'james.wong@outlook.com', true, '2025-04-20 14:00:00+08', 'whatsapp', 'whatsapp', 'buyer', 'Singaporean', 'citizen', NULL),
('c0000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Priya Nair', '+6596543210', 'priya.nair@hotmail.com', true, '2025-04-22 09:15:00+08', 'form', 'facebook_ad', 'buyer', 'Indian', 'pr', NULL),
('c0000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Michael Chen Jia Wei', '+6585432109', 'michael.chen@icloud.com', false, NULL, NULL, 'referral', 'buyer', 'Singaporean', 'citizen', 'https://linkedin.com/in/michaelchenjw'),
('c0000005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Sarah Tan Hui Wen', '+6594321098', 'sarah.tan@yahoo.com', true, '2025-05-01 11:00:00+08', 'form', 'instagram_ad', 'buyer', 'Singaporean', 'citizen', NULL),
('c0000006-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Ahmad bin Ibrahim', '+6583210987', 'ahmad.ibrahim@gmail.com', true, '2025-05-02 16:30:00+08', 'whatsapp', 'whatsapp', 'seller', 'Singaporean', 'citizen', NULL),
('c0000007-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Liu Wei', '+6572109876', NULL, false, NULL, NULL, 'portal', 'buyer', 'Chinese', 'other', NULL),
('c0000008-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Tan Boon Kiat', '+6591098765', 'boonkiat@propnex.com', true, '2025-04-10 08:00:00+08', 'manual', 'referral', 'co_broke_agent', 'Singaporean', 'citizen', NULL),
('c0000009-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Aisha bte Yusof', '+6580987654', 'aisha.yusof@gmail.com', true, '2025-05-03 13:45:00+08', 'form', 'facebook_ad', 'buyer', 'Singaporean', 'citizen', NULL),
('c0000010-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Kevin Ng Chee Keong', '+6599876543', 'kevin.ng@gmail.com', true, '2025-05-04 10:00:00+08', 'form', 'facebook_ad', 'tenant', 'Singaporean', 'citizen', NULL),
('c0000011-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'Siti Nurhaliza', '+6588765432', 'siti.n@gmail.com', true, '2025-05-05 09:30:00+08', 'whatsapp', 'web_form', 'buyer', 'Malaysian', 'pr', NULL),
('c0000012-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'Robert Koh Eng Huat', '+6577654321', 'robert.koh@gmail.com', false, NULL, NULL, 'open_house', 'buyer', 'Singaporean', 'citizen', 'https://linkedin.com/in/robertkoh'),
('c0000013-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', 'Yamamoto Kenji', '+6566543210', 'kenji.y@company.jp', false, NULL, NULL, 'facebook_ad', 'buyer', 'Japanese', 'other', NULL),
('c0000014-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', 'Linda Goh Siew Lan', '+6595432109', 'linda.goh@gmail.com', true, '2025-04-28 15:00:00+08', 'form', 'facebook_ad', 'landlord', 'Singaporean', 'citizen', NULL),
('c0000015-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', 'Raj Patel', '+6584321098', 'raj.patel@outlook.com', true, '2025-05-06 11:30:00+08', 'form', 'instagram_ad', 'buyer', 'Indian', 'ep', NULL);

-- ============================================================
-- DEMO LISTINGS (8 realistic Singapore properties)
-- ============================================================
INSERT INTO listings (id, tenant_id, agent_id, address, postal_code, district, property_type, hdb_type, tenure, floor_area_sqft, asking_price, asking_rental, listing_status, listing_type, floor, unit_number, completion_year, description, is_exclusive, media_urls) VALUES
('10000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '8 Nassim Road', '258373', 'D10', 'landed', NULL, 'freehold', 6500, 12800000, NULL, 'live', 'sale', NULL, NULL, 1998, 'Stunning Good Class Bungalow in prime District 10. Sprawling 6,500 sqft built-up on generous land plot. Mature garden, pool, and separate guest quarters. Walk to Orchard Road and top international schools.', true, '{}'),
('10000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '1 Shenton Way #32-01, One Shenton', '068803', 'D01', 'condo', NULL, '99yr', 1292, 2380000, NULL, 'live', 'sale', '32', '#32-01', 2011, 'High-floor 3-bedroom unit at One Shenton with panoramic Marina Bay views. Dual-key layout, fully renovated in 2023. Walking distance to Raffles Place MRT and CBD.', false, '{}'),
('10000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '123 Bishan Street 12 #08-456', '570123', 'D20', 'hdb', '4room', '99yr', 990, 680000, NULL, 'live', 'sale', '8', '#08-456', 2005, 'Well-maintained 4-room HDB in mature Bishan estate. Near Bishan MRT, Junction 8 mall, and top schools. Unblocked view facing park.', false, '{}'),
('10000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10 Draycott Park #15-03, Ardmore Residence', '259400', 'D10', 'condo', NULL, 'freehold', 2885, 7200000, NULL, 'under_offer', 'sale', '15', '#15-03', 2014, 'Ultra-luxury 4-bedroom at Ardmore Residence by Wheelock. Premium fittings, private lift lobby, stunning Orchard skyline views. Includes 2 car park lots.', true, '{}'),
('10000005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '15 Amber Road #05-12, Amber Skye', '439868', 'D15', 'condo', NULL, 'freehold', 1098, NULL, 4800, 'live', 'rental', '5', '#05-12', 2017, 'Stylish 2-bedroom at Amber Skye, East Coast. Fully furnished, designer kitchen, balcony with sea breeze. 5 min walk to Paya Lebar MRT.', false, '{}'),
('10000006-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '456 Tampines Street 42 #12-789', '520456', 'D18', 'hdb', '5room', '99yr', 1184, 620000, NULL, 'live', 'sale', '12', '#12-789', 2010, 'Spacious 5-room HDB in Tampines. Corner unit with extra windows. Near Tampines Hub and Tampines MRT. Renovated kitchen and bathrooms.', false, '{}'),
('10000007-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22 Martin Place #28-05, Martin Modern', '237988', 'D09', 'condo', NULL, 'freehold', 764, NULL, 5200, 'live', 'rental', '28', '#28-05', 2021, 'Brand new 1-bedroom plus study at Martin Modern. River Valley location, lush landscaping. Fully furnished with Smeg appliances. Walk to Great World MRT.', false, '{}'),
('10000008-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88 Holland Road', '258880', 'D10', 'landed', NULL, 'freehold', 4200, 8500000, NULL, 'draft', 'sale', NULL, NULL, 2015, 'Modern semi-detached in Holland Village enclave. 4 bedrooms, home office, rooftop terrace. Quiet cul-de-sac, walk to Holland Village MRT.', false, '{}');

-- ============================================================
-- DEMO LEADS (12 leads across various pipeline stages)
-- ============================================================
INSERT INTO leads (id, tenant_id, contact_id, assigned_to, status, source, ad_campaign_id, deal_type, urgency, budget_min, budget_max, residency_status, property_ownership, eligibility_risk, eligibility_flag_reason, intent_score, time_on_form_seconds, timeline_declared, verification_score, paynow_verified, last_activity_at, created_at) VALUES
('d0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'viewing_booked', 'facebook_ad', 'camp_landed_d10', 'sale', 'hot', 8000000, 15000000, 'citizen', 'private', false, NULL, 5, 45, '0_3mo', 3, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days'),
('d0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'contacted', 'whatsapp', NULL, 'sale', 'warm', 2000000, 3000000, 'citizen', 'hdb', false, NULL, 3, NULL, '3_6mo', 2, false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '7 days'),
('d0000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'qualified', 'facebook_ad', 'camp_condo_d15', 'sale', 'warm', 1500000, 2500000, 'pr', 'none', false, NULL, 4, 38, '3_6mo', 2, true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '12 days'),
('d0000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'negotiating', 'referral', NULL, 'sale', 'hot', 5000000, 8000000, 'citizen', 'private', false, NULL, 5, NULL, '0_3mo', 3, true, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '21 days'),
('d0000005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'c0000005-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'new_lead', 'instagram_ad', 'camp_hdb_bishan', 'resale', 'warm', 600000, 750000, 'citizen', 'none', false, NULL, 4, 22, '3_6mo', NULL, false, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
('d0000006-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'c0000006-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'qualified', 'whatsapp', NULL, 'sale', 'warm', NULL, NULL, 'citizen', 'hdb', false, NULL, 3, NULL, '6_12mo', 2, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '14 days'),
('d0000007-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'c0000007-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'new_lead', 'portal', NULL, 'sale', 'cold', 5000000, 10000000, 'other', 'none', true, 'Foreigner cannot buy landed property in Singapore', 2, NULL, 'exploring', 1, false, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('d0000008-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'c0000009-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'viewing_done', 'facebook_ad', 'camp_condo_d20', 'sale', 'warm', 1200000, 1800000, 'citizen', 'hdb', false, NULL, 4, 30, '3_6mo', 2, true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '18 days'),
('d0000009-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'c0000010-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'viewing_booked', 'facebook_ad', 'camp_rental_d15', 'rental', 'hot', 4000, 5500, 'citizen', 'none', false, NULL, 5, 18, '0_3mo', 2, false, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '5 days'),
('d0000010-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'c0000011-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'contacted', 'web_form', NULL, 'sale', 'warm', 1000000, 1500000, 'pr', 'none', false, NULL, 3, NULL, '6_12mo', NULL, false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '6 days'),
('d0000011-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'c0000013-0000-0000-0000-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'new_lead', 'facebook_ad', 'camp_condo_d01', 'sale', 'cold', 3000000, 5000000, 'other', 'none', false, NULL, 2, 8, 'exploring', 1, false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('d0000012-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'c0000015-0000-0000-0000-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'new_lead', 'instagram_ad', 'camp_rental_cbd', 'rental', 'warm', 3500, 5000, 'ep', 'none', false, NULL, 4, 25, '0_3mo', NULL, false, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours');

-- ============================================================
-- DEMO BUYER REQUIREMENTS
-- ============================================================
INSERT INTO buyer_requirements (tenant_id, contact_id, lead_id, districts, property_types, hdb_types, tenure_preference, budget_min, budget_max, min_sqft, bedrooms_min, deal_type, timeline) VALUES
('11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', '{D10,D11}', '{landed}', '{}', 'freehold', 8000000, 15000000, 5000, 5, 'sale', 'Within 3 months'),
('11111111-1111-1111-1111-111111111111', 'c0000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', '{D09,D10,D11}', '{condo}', '{}', NULL, 2000000, 3000000, 1000, 3, 'sale', '3-6 months'),
('11111111-1111-1111-1111-111111111111', 'c0000003-0000-0000-0000-000000000003', 'd0000003-0000-0000-0000-000000000003', '{D15,D16}', '{condo}', '{}', 'freehold', 1500000, 2500000, 900, 2, 'sale', '3-6 months'),
('11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', '{D09,D10}', '{condo}', '{}', 'freehold', 5000000, 8000000, 2500, 4, 'sale', 'Within 3 months'),
('11111111-1111-1111-1111-111111111111', 'c0000005-0000-0000-0000-000000000005', 'd0000005-0000-0000-0000-000000000005', '{D20}', '{hdb}', '{4room,5room}', NULL, 600000, 750000, 900, 3, 'resale', '3-6 months'),
('11111111-1111-1111-1111-111111111111', 'c0000009-0000-0000-0000-000000000009', 'd0000008-0000-0000-0000-000000000008', '{D19,D20}', '{condo}', '{}', NULL, 1200000, 1800000, 800, 3, 'sale', '3-6 months');

-- ============================================================
-- DEMO VIEWINGS
-- ============================================================
INSERT INTO viewings (tenant_id, lead_id, listing_id, scheduled_at, duration_mins, status, attended, feedback_notes, buyer_interest_level) VALUES
('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days', 90, 'completed', true, 'Very impressed with the garden and pool. Concerned about renovation costs for the kitchen. Wants to bring husband for second viewing.', 4),
('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days', 60, 'scheduled', NULL, NULL, NULL),
('11111111-1111-1111-1111-111111111111', 'd0000009-0000-0000-0000-000000000009', '10000005-0000-0000-0000-000000000005', NOW() + INTERVAL '1 day', 45, 'scheduled', NULL, NULL, NULL),
('11111111-1111-1111-1111-111111111111', 'd0000009-0000-0000-0000-000000000009', '10000007-0000-0000-0000-000000000007', NOW() + INTERVAL '1 day' + INTERVAL '3 hours', 45, 'scheduled', NULL, NULL, NULL),
('11111111-1111-1111-1111-111111111111', 'd0000008-0000-0000-0000-000000000008', '10000002-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days', 60, 'completed', true, 'Liked the view but felt the unit was too far from MRT. Price slightly above budget. Will think about it.', 3),
('11111111-1111-1111-1111-111111111111', 'd0000004-0000-0000-0000-000000000004', '10000004-0000-0000-0000-000000000004', NOW() - INTERVAL '7 days', 60, 'completed', true, 'Absolutely loves the unit. Wife also very keen. Asking about flexibility on price. Ready to make offer.', 5);

-- ============================================================
-- DEMO DEALS
-- ============================================================
INSERT INTO deals (id, tenant_id, lead_id, listing_id, deal_type, status, offer_price, agreed_price, commission_pct, commission_amount, co_broke_agent_id, co_broke_split_pct, otp_date, completion_date, notes, commission_payment_status) VALUES
('de000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000004-0000-0000-0000-000000000004', '10000004-0000-0000-0000-000000000004', 'sale', 'negotiating', 6800000, NULL, 2, NULL, 'c0000008-0000-0000-0000-000000000008', 50, NULL, NULL, 'Buyer offered $6.8M. Seller asking $7.2M. Co-broke with Boon Kiat from PropNex.', 'unpaid'),
('de000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'd0000009-0000-0000-0000-000000000009', '10000005-0000-0000-0000-000000000005', 'rental', 'completed', NULL, 4800, 1, 4800, NULL, 0, '2025-04-15', '2025-05-01', 'Smooth rental transaction. Tenant moved in on 1 May. 2-year lease.', 'received');

-- ============================================================
-- DEMO MESSAGES (WhatsApp conversations)
-- ============================================================
INSERT INTO messages (tenant_id, contact_id, lead_id, direction, channel, body, status, sent_at) VALUES
('11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'inbound', 'whatsapp', 'Hi David, I saw your ad for the Nassim Road property. Is it still available?', 'read', NOW() - INTERVAL '10 days'),
('11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'outbound', 'whatsapp', 'Hi Rachel! Yes, 8 Nassim Road is still available. It is a beautiful GCB with 6,500 sqft built-up. Would you like to arrange a viewing?', 'read', NOW() - INTERVAL '10 days' + INTERVAL '15 minutes'),
('11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'inbound', 'whatsapp', 'Yes please! I am free this Saturday afternoon. My budget is around $12-15M. Is the asking price negotiable?', 'read', NOW() - INTERVAL '10 days' + INTERVAL '30 minutes'),
('11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'outbound', 'whatsapp', 'Great! I have booked you in for Saturday 2pm. The asking is $12.8M and there is some room for discussion. I will send you the full brochure now.', 'read', NOW() - INTERVAL '10 days' + INTERVAL '45 minutes'),
('11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'inbound', 'whatsapp', 'Perfect, received the brochure. See you Saturday!', 'read', NOW() - INTERVAL '10 days' + INTERVAL '1 hour'),
('11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'outbound', 'whatsapp', 'Hi Rachel, hope you enjoyed the viewing yesterday! The owner is open to offers above $12M. Would you like to bring your husband for a second look?', 'delivered', NOW() - INTERVAL '2 days'),
('11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'inbound', 'whatsapp', 'Yes! He is free this coming Wednesday evening. Can we do 6pm?', 'read', NOW() - INTERVAL '1 day'),
('11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'outbound', 'whatsapp', 'Wednesday 6pm works perfectly. I have confirmed with the owner. See you both then!', 'delivered', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),
('11111111-1111-1111-1111-111111111111', 'c0000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', 'inbound', 'whatsapp', 'Hello, I am looking for a 3-bedroom condo around Orchard/River Valley area. Budget around $2-3M. Can you help?', 'read', NOW() - INTERVAL '7 days'),
('11111111-1111-1111-1111-111111111111', 'c0000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', 'outbound', 'whatsapp', 'Hi James! Absolutely, I have several options in D09-D11 within your budget. Are you a first-time buyer or upgrading?', 'read', NOW() - INTERVAL '7 days' + INTERVAL '20 minutes'),
('11111111-1111-1111-1111-111111111111', 'c0000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', 'inbound', 'whatsapp', 'Upgrading from HDB. Currently staying in Toa Payoh 4-room. Looking to sell and upgrade to condo.', 'read', NOW() - INTERVAL '7 days' + INTERVAL '1 hour'),
('11111111-1111-1111-1111-111111111111', 'c0000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', 'outbound', 'whatsapp', 'Got it! Since you are a citizen upgrading, no ABSD on your first private property. I will shortlist 3-4 units for you. When are you free for viewings?', 'delivered', NOW() - INTERVAL '6 days'),
('11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'outbound', 'whatsapp', 'Hi Michael, David here from PropNex. Your friend Jason mentioned you are looking for a luxury condo in D9-D10. I have a stunning unit at Ardmore Residence. Interested?', 'read', NOW() - INTERVAL '21 days'),
('11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'inbound', 'whatsapp', 'Hi David, yes Jason spoke highly of you. Ardmore Residence sounds interesting. What is the asking and size?', 'read', NOW() - INTERVAL '21 days' + INTERVAL '3 hours'),
('11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'outbound', 'whatsapp', '4-bedroom, 2,885 sqft on 15th floor. Asking $7.2M, about $2,495 psf. Freehold, private lift lobby. Shall I arrange a viewing?', 'read', NOW() - INTERVAL '20 days'),
('11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'inbound', 'whatsapp', 'That is within my range. Let us do Thursday 3pm if possible.', 'read', NOW() - INTERVAL '20 days' + INTERVAL '1 hour'),
('11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'inbound', 'whatsapp', 'David, my wife and I loved the unit. We would like to make an offer. Can we discuss?', 'read', NOW() - INTERVAL '7 days'),
('11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'outbound', 'whatsapp', 'Wonderful news! Let us discuss. What figure did you have in mind? The seller is motivated but firm above $7M.', 'read', NOW() - INTERVAL '7 days' + INTERVAL '30 minutes'),
('11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'inbound', 'whatsapp', 'We are thinking $6.8M. Is there room to negotiate?', 'read', NOW() - INTERVAL '6 days'),
('11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'outbound', 'whatsapp', 'I have conveyed your offer. Seller came back at $7.1M. Shall we try to meet in the middle around $6.95M?', 'delivered', NOW() - INTERVAL '1 day');

-- ============================================================
-- DEMO TASKS
-- ============================================================
INSERT INTO tasks (tenant_id, lead_id, deal_id, assigned_to, title, due_at, completed_at, priority) VALUES
('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Prepare comparable sales report for Rachel (Nassim Rd)', NOW() + INTERVAL '1 day', NULL, 'high'),
('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Confirm Wednesday 6pm viewing with owner', NOW(), NULL, 'high'),
('11111111-1111-1111-1111-111111111111', 'd0000002-0000-0000-0000-000000000002', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Send James shortlist of D09-D11 condos', NOW() - INTERVAL '1 day', NULL, 'medium'),
('11111111-1111-1111-1111-111111111111', 'd0000004-0000-0000-0000-000000000004', 'de000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Follow up with Michael on counter-offer response', NOW(), NULL, 'high'),
('11111111-1111-1111-1111-111111111111', 'd0000005-0000-0000-0000-000000000005', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Call Sarah to discuss HDB options in Bishan', NOW() + INTERVAL '2 days', NULL, 'medium'),
('11111111-1111-1111-1111-111111111111', 'd0000009-0000-0000-0000-000000000009', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Send Kevin viewing confirmation for tomorrow', NOW(), NULL, 'high'),
('11111111-1111-1111-1111-111111111111', 'd0000003-0000-0000-0000-000000000003', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Schedule viewing for Priya at Amber area condos', NOW() + INTERVAL '3 days', NULL, 'medium'),
('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Verify Rachel PayNow identity', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', 'high'),
('11111111-1111-1111-1111-111111111111', 'd0000004-0000-0000-0000-000000000004', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Arrange Ardmore Residence viewing for Michael', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', 'high'),
('11111111-1111-1111-1111-111111111111', 'd0000009-0000-0000-0000-000000000009', 'de000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Prepare tenancy agreement for Kevin', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', 'high');

-- ============================================================
-- DEMO CAMPAIGNS
-- ============================================================
INSERT INTO campaigns (tenant_id, platform, page_id, ad_account_id, campaign_name, status, leads_count, budget, start_date, end_date) VALUES
('11111111-1111-1111-1111-111111111111', 'facebook', 'page_12345', 'act_67890', 'Landed D10 — GCB Buyers', 'active', 3, 500, '2025-04-01', NULL),
('11111111-1111-1111-1111-111111111111', 'facebook', 'page_12345', 'act_67890', 'Condo D15 East Coast', 'active', 2, 300, '2025-04-15', NULL),
('11111111-1111-1111-1111-111111111111', 'instagram', 'page_12345', 'act_67890', 'HDB Bishan Upgraders', 'active', 1, 200, '2025-05-01', NULL),
('11111111-1111-1111-1111-111111111111', 'facebook', 'page_12345', 'act_67890', 'Rental CBD Expats', 'active', 2, 250, '2025-04-20', NULL),
('11111111-1111-1111-1111-111111111111', 'facebook', 'page_12345', 'act_67890', 'Condo D01 Marina Bay', 'paused', 1, 400, '2025-03-15', '2025-04-30');

-- ============================================================
-- DEMO WA NUMBER
-- ============================================================
INSERT INTO wa_numbers (tenant_id, phone_number, bsp_account_id, display_name, is_shared, routing_mode, status) VALUES
('11111111-1111-1111-1111-111111111111', '+6591234567', '360d_acc_demo', 'David Tan Property', false, 'direct', 'active');

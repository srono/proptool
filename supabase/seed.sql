-- PropAgent SG — Seed Data
-- Stamp duty rates and eligibility rules (as of April 2023 ABSD revision)

-- ============================================================
-- BSD RATES (Buyer's Stamp Duty) — applies to all buyers
-- Effective from 15 Feb 2023
-- ============================================================
INSERT INTO stamp_duty_rates (duty_type, buyer_profile, property_count, price_band_min, price_band_max, rate_pct, effective_from) VALUES
-- BSD is the same regardless of buyer profile or property count
('BSD', 'citizen', '1st', 0, 180000, 1, '2023-02-15'),
('BSD', 'citizen', '1st', 180000, 360000, 2, '2023-02-15'),
('BSD', 'citizen', '1st', 360000, 1000000, 3, '2023-02-15'),
('BSD', 'citizen', '1st', 1000000, 1500000, 4, '2023-02-15'),
('BSD', 'citizen', '1st', 1500000, 3000000, 5, '2023-02-15'),
('BSD', 'citizen', '1st', 3000000, NULL, 6, '2023-02-15');

-- ============================================================
-- ABSD RATES (Additional Buyer's Stamp Duty)
-- Effective from 27 April 2023
-- ============================================================

-- Singapore Citizens
INSERT INTO stamp_duty_rates (duty_type, buyer_profile, property_count, price_band_min, price_band_max, rate_pct, effective_from) VALUES
('ABSD', 'citizen', '1st', 0, NULL, 0, '2023-04-27'),
('ABSD', 'citizen', '2nd', 0, NULL, 20, '2023-04-27'),
('ABSD', 'citizen', '3rd_plus', 0, NULL, 30, '2023-04-27');

-- Permanent Residents
INSERT INTO stamp_duty_rates (duty_type, buyer_profile, property_count, price_band_min, price_band_max, rate_pct, effective_from) VALUES
('ABSD', 'pr', '1st', 0, NULL, 5, '2023-04-27'),
('ABSD', 'pr', '2nd', 0, NULL, 30, '2023-04-27'),
('ABSD', 'pr', '3rd_plus', 0, NULL, 35, '2023-04-27');

-- Foreigners
INSERT INTO stamp_duty_rates (duty_type, buyer_profile, property_count, price_band_min, price_band_max, rate_pct, effective_from) VALUES
('ABSD', 'foreigner', '1st', 0, NULL, 60, '2023-04-27'),
('ABSD', 'foreigner', '2nd', 0, NULL, 60, '2023-04-27'),
('ABSD', 'foreigner', '3rd_plus', 0, NULL, 60, '2023-04-27');

-- Entities
INSERT INTO stamp_duty_rates (duty_type, buyer_profile, property_count, price_band_min, price_band_max, rate_pct, effective_from) VALUES
('ABSD', 'entity', '1st', 0, NULL, 65, '2023-04-27'),
('ABSD', 'entity', '2nd', 0, NULL, 65, '2023-04-27'),
('ABSD', 'entity', '3rd_plus', 0, NULL, 65, '2023-04-27');

-- Trusts
INSERT INTO stamp_duty_rates (duty_type, buyer_profile, property_count, price_band_min, price_band_max, rate_pct, effective_from) VALUES
('ABSD', 'trust', '1st', 0, NULL, 65, '2023-04-27'),
('ABSD', 'trust', '2nd', 0, NULL, 65, '2023-04-27'),
('ABSD', 'trust', '3rd_plus', 0, NULL, 65, '2023-04-27');

-- ============================================================
-- ELIGIBILITY RULES
-- ============================================================
INSERT INTO eligibility_rules (buyer_profile, property_type, property_count, eligible, restriction_note, absd_rate_pct) VALUES
-- Citizens
('citizen', 'hdb', '1st', true, NULL, 0),
('citizen', 'hdb', '2nd', true, 'Must sell existing HDB within 6 months', 20),
('citizen', 'hdb', '3rd_plus', false, 'Cannot own more than 1 HDB', 0),
('citizen', 'condo', '1st', true, NULL, 0),
('citizen', 'condo', '2nd', true, NULL, 20),
('citizen', 'condo', '3rd_plus', true, NULL, 30),
('citizen', 'landed', '1st', true, NULL, 0),
('citizen', 'landed', '2nd', true, NULL, 20),
('citizen', 'landed', '3rd_plus', true, NULL, 30),
('citizen', 'commercial', '1st', true, 'No ABSD for commercial', 0),
('citizen', 'commercial', '2nd', true, 'No ABSD for commercial', 0),
('citizen', 'commercial', '3rd_plus', true, 'No ABSD for commercial', 0),

-- PRs
('pr', 'hdb', '1st', true, 'Resale HDB only. Must meet 3-year PR requirement.', 5),
('pr', 'hdb', '2nd', false, 'PRs limited to 1 HDB', 0),
('pr', 'hdb', '3rd_plus', false, 'PRs limited to 1 HDB', 0),
('pr', 'condo', '1st', true, NULL, 5),
('pr', 'condo', '2nd', true, NULL, 30),
('pr', 'condo', '3rd_plus', true, NULL, 35),
('pr', 'landed', '1st', true, 'Requires SLA approval under Residential Property Act', 5),
('pr', 'landed', '2nd', true, 'Requires SLA approval', 30),
('pr', 'landed', '3rd_plus', true, 'Requires SLA approval', 35),
('pr', 'commercial', '1st', true, 'No ABSD for commercial', 0),
('pr', 'commercial', '2nd', true, 'No ABSD for commercial', 0),
('pr', 'commercial', '3rd_plus', true, 'No ABSD for commercial', 0),

-- Foreigners
('foreigner', 'hdb', '1st', false, 'Foreigners cannot buy HDB', 0),
('foreigner', 'hdb', '2nd', false, 'Foreigners cannot buy HDB', 0),
('foreigner', 'hdb', '3rd_plus', false, 'Foreigners cannot buy HDB', 0),
('foreigner', 'condo', '1st', true, '60% ABSD applies', 60),
('foreigner', 'condo', '2nd', true, '60% ABSD applies', 60),
('foreigner', 'condo', '3rd_plus', true, '60% ABSD applies', 60),
('foreigner', 'landed', '1st', false, 'Foreigners cannot buy landed (except approved Sentosa Cove)', 0),
('foreigner', 'landed', '2nd', false, 'Foreigners cannot buy landed', 0),
('foreigner', 'landed', '3rd_plus', false, 'Foreigners cannot buy landed', 0),
('foreigner', 'commercial', '1st', true, 'No ABSD for commercial', 0),
('foreigner', 'commercial', '2nd', true, 'No ABSD for commercial', 0),
('foreigner', 'commercial', '3rd_plus', true, 'No ABSD for commercial', 0),

-- Entities
('entity', 'hdb', '1st', false, 'Entities cannot buy HDB', 0),
('entity', 'hdb', '2nd', false, 'Entities cannot buy HDB', 0),
('entity', 'hdb', '3rd_plus', false, 'Entities cannot buy HDB', 0),
('entity', 'condo', '1st', true, '65% ABSD applies', 65),
('entity', 'condo', '2nd', true, '65% ABSD applies', 65),
('entity', 'condo', '3rd_plus', true, '65% ABSD applies', 65),
('entity', 'landed', '1st', false, 'Entities generally cannot buy landed', 0),
('entity', 'landed', '2nd', false, 'Entities generally cannot buy landed', 0),
('entity', 'landed', '3rd_plus', false, 'Entities generally cannot buy landed', 0),
('entity', 'commercial', '1st', true, 'No ABSD for commercial', 0),
('entity', 'commercial', '2nd', true, 'No ABSD for commercial', 0),
('entity', 'commercial', '3rd_plus', true, 'No ABSD for commercial', 0),

-- Trusts
('trust', 'hdb', '1st', false, 'Trusts cannot buy HDB', 0),
('trust', 'hdb', '2nd', false, 'Trusts cannot buy HDB', 0),
('trust', 'hdb', '3rd_plus', false, 'Trusts cannot buy HDB', 0),
('trust', 'condo', '1st', true, '65% ABSD applies', 65),
('trust', 'condo', '2nd', true, '65% ABSD applies', 65),
('trust', 'condo', '3rd_plus', true, '65% ABSD applies', 65),
('trust', 'landed', '1st', false, 'Trusts generally cannot buy landed', 0),
('trust', 'landed', '2nd', false, 'Trusts generally cannot buy landed', 0),
('trust', 'landed', '3rd_plus', false, 'Trusts generally cannot buy landed', 0),
('trust', 'commercial', '1st', true, 'No ABSD for commercial', 0),
('trust', 'commercial', '2nd', true, 'No ABSD for commercial', 0),
('trust', 'commercial', '3rd_plus', true, 'No ABSD for commercial', 0);

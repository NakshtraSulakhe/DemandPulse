# DemandFlow Slides — Database Backup & Retention Policy

## 1. Overview
The `demandflow_slides` MySQL database stores all historical business analytics, daily campaign target snapshots, agent productivity checkpoints, QA interval metrics, floor capacity trends, attendance snapshots, incentive reports, and presentation preferences.

This document defines backup procedures, disaster recovery testing, data retention principles, index optimization, and storage growth monitoring.

---

## 2. Storage Principles & Non-Destructive Retention
- **No Automatic Deletion**: Historical daily snapshots (`campaign_daily_snapshots`, `agent_daily_snapshots`, `floor_daily_snapshots`, `qa_daily_snapshots`, `attendance_daily_snapshots`, `incentive_daily_snapshots`) are **never deleted**.
- **Immutable Financial Copies**: Payout reporting copies in `incentive_daily_snapshots` lock payment references and amounts; past paid numbers are never overwritten.
- **Audit Trails Preserved**: `slide_audit_logs`, `slide_campaign_target_audit`, `incentive_policy_approvals`, and `analytics_sync_runs` remain intact indefinitely.
- **Partitioning & Compaction**: If interval tables (`qa_interval_metrics`, `agent_interval_metrics`) exceed 10 million rows after multiple years, monthly table partitioning by `work_date` range can be applied without altering application queries.

---

## 3. Automated Backup Procedures

### A. Timestamped mysqldump Script
A pre-configured backup script is available at [`scripts/backup-database.js`](file:///c:/Users/Nakshtra/OneDrive/Documents/Slides/scripts/backup-database.js).

To run manually:
```bash
node scripts/backup-database.js
```
The backup creates a full `.sql` dump under `data/backups/demandflow_slides_backup_<timestamp>.sql`.

### B. Standard Command-Line Backup
```bash
mysqldump -h localhost -u root --routines --triggers --single-transaction demandflow_slides > backup.sql
```

### C. Windows Task Scheduler / Cron Job
To schedule daily backups at 03:00 AM IST (after the 02:30 AM shift cutoff):
- **Trigger**: Daily at 03:00 AM
- **Action**: `node C:\Users\Nakshtra\OneDrive\Documents\Slides\scripts\backup-database.js`

---

## 4. Disaster Recovery & Restore Testing
To test or execute database restoration:

1. Create a clean database (or restore to a testing database):
   ```sql
   CREATE DATABASE IF NOT EXISTS demandflow_slides_restore;
   ```
2. Import the backup:
   ```bash
   mysql -u root demandflow_slides_restore < data/backups/demandflow_slides_backup_<timestamp>.sql
   ```
3. Verify row counts and table integrity:
   ```sql
   USE demandflow_slides_restore;
   SHOW TABLES;
   SELECT COUNT(*) FROM campaign_daily_snapshots;
   SELECT COUNT(*) FROM agent_daily_snapshots;
   ```

---

## 5. Indexes and Query Optimization
All 12 additive tables feature optimized compound indexes:
- `work_date` + status fields (`target_achieved`, `target_completion_pct`, `payment_status`).
- Unique compound constraints (`crm_campaign_id, work_date, snapshot_version`) to guarantee zero duplicate records during repeated synchronizations.
- `interval_start_at` indexed with `work_date` for 10-minute heatmap fast range scans.

---

## 6. Storage Growth Monitoring
To monitor table sizes in MySQL:
```sql
SELECT 
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'demandflow_slides'
ORDER BY (data_length + index_length) DESC;
```

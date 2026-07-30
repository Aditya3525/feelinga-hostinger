<?php
declare(strict_types=1);

/**
 * Audit logging
 * Reference: backend/src/utils/auditLog.ts
 */

/**
 * Log an admin action to the audit_log table
 */
function log_admin_action(array $params): void
{
    $actor = $params['actor'] ?? null;
    $action = $params['action'] ?? '';
    $entityType = $params['entityType'] ?? '';
    $entityId = $params['entityId'] ?? null;
    $summary = $params['summary'] ?? '';
    $meta = $params['meta'] ?? [];

    if (!$actor) {
        return;
    }

    try {
        $db = get_db();
        $stmt = $db->prepare('INSERT INTO audit_log (actor_id, actor_name, actor_role, action, entity_type, entity_id, summary, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $actor['id'],
            $actor['name'] ?? '',
            $actor['role'] ?? 'admin',
            $action,
            $entityType,
            $entityId,
            $summary,
            json_encode($meta, JSON_UNESCAPED_UNICODE),
        ]);
    } catch (Exception $e) {
        // Don't let audit logging failures break the request
        error_log('[AuditLog] Failed: ' . $e->getMessage());
    }
}

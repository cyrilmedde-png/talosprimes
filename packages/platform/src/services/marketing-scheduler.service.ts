/**
 * Marketing Scheduler — Publie automatiquement les posts planifiés
 * dont la datePublication est passée.
 *
 * Vérifie toutes les 60 secondes s'il y a des posts à publier.
 */
import { prisma } from '../config/database.js';
import { n8nService } from './n8n.service.js';

const CHECK_INTERVAL_MS = 60_000; // 60 secondes

let intervalId: ReturnType<typeof setInterval> | null = null;

async function publishDuePosts(): Promise<void> {
  try {
    // Trouver tous les posts planifiés dont la date est passée
    const duePosts = await prisma.marketingPost.findMany({
      where: {
        status: 'planifie',
        datePublication: {
          lte: new Date(),
        },
      },
      orderBy: { datePublication: 'asc' },
      take: 10, // Limiter pour éviter de surcharger n8n
    });

    if (duePosts.length === 0) return;

    console.log(`📅 [Marketing Scheduler] ${duePosts.length} publication(s) à déclencher`);

    for (const post of duePosts) {
      try {
        // Marquer en cours pour éviter les doubles déclenchements
        await prisma.marketingPost.update({
          where: { id: post.id },
          data: { status: 'publie' }, // temporairement publie, sera mis à jour par le workflow
        });

        // Appeler n8n pour publier
        const result = await n8nService.callWorkflowReturn(post.tenantId, 'marketing_auto_publish', {
          manual: true,
          post_id: post.id,
          plateforme: post.plateforme,
          type: post.type,
          sujet: post.sujet,
          contenu_texte: post.contenuTexte || '',
          hashtags: post.hashtags || '',
          contenu_visuel_url: post.contenuVisuelUrl || '',
          contenu_video_url: post.contenuVideoUrl || '',
        });

        // Mettre à jour avec le résultat
        const n8nResult = result as Record<string, unknown> | null;
        const hasError = n8nResult && (n8nResult.error || n8nResult.status === 'erreur');

        await prisma.marketingPost.update({
          where: { id: post.id },
          data: {
            status: hasError ? 'erreur' : 'publie',
            ...(hasError ? { erreurDetail: String(n8nResult?.error || 'Erreur workflow') } : {}),
            ...(!hasError && n8nResult?.postExternalId ? { postExternalId: String(n8nResult.postExternalId) } : {}),
          },
        });

        console.log(`✅ [Marketing Scheduler] Post ${post.id} (${post.plateforme}) → ${hasError ? 'ERREUR' : 'publié'}`);
      } catch (err) {
        // Marquer en erreur si le workflow a échoué
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ [Marketing Scheduler] Erreur post ${post.id}:`, errMsg);

        await prisma.marketingPost.update({
          where: { id: post.id },
          data: {
            status: 'erreur',
            erreurDetail: `Scheduler: ${errMsg}`.substring(0, 500),
          },
        }).catch(() => { /* ignore update error */ });
      }
    }
  } catch (err) {
    console.error('[Marketing Scheduler] Erreur globale:', err instanceof Error ? err.message : err);
  }
}

export function startMarketingScheduler(): void {
  if (intervalId) return; // Déjà démarré

  console.log('📅 [Marketing Scheduler] Démarré — vérification toutes les 60s');

  // Premier check immédiat
  publishDuePosts();

  // Puis toutes les 60 secondes
  intervalId = setInterval(publishDuePosts, CHECK_INTERVAL_MS);
}

export function stopMarketingScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('📅 [Marketing Scheduler] Arrêté');
  }
}

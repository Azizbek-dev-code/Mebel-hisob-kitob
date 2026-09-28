import {
  FeatureKey,
  SMM_CONTENT_STATUS_LABELS,
  SMM_CONTENT_STATUS_TRANSITIONS,
  SMM_CONTENT_TYPE_LABELS,
  SMM_PLATFORM_LABELS,
  SMM_TEMPLATE_SCOPE_LABELS,
  SmmContentStatus,
  SmmContentType,
  SmmTemplateScope,
  type SmmTemplateScope as SmmTemplateScopeType,
  type UpdateSmmContentItemRequest,
} from '@furniture-erp/shared';
import { ArrowLeft, Copy, LayoutTemplate, Loader2, Plus, Save } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkerLookup } from '@/features/sales/hooks/use-sales';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { parseMoneyInput, formatMoney } from '@/utils/format';

import { ApprovalPanel } from '../../components/ApprovalPanel';
import { ContentAssignmentsPanel } from '../../components/ContentAssignmentsPanel';
import { ContentBlocksEditor } from '../../components/ContentBlocksEditor';
import { ContentStatusBadge } from '../../components/ContentStatusBadge';
import {
  useArchiveSmmContent,
  useCreateSmmCampaign,
  useCreateSmmCost,
  useCreateSmmPillar,
  useDeleteSmmFile,
  useDuplicateSmmContent,
  useReplaceSmmBlocks,
  useSaveSmmContentAsTemplate,
  useSmmAudience,
  useSmmCampaigns,
  useSmmContentAnalytics,
  useSmmContentDetail,
  useSmmFiles,
  useSmmPersonas,
  useSmmPillars,
  useSmmReferences,
  useTransitionSmmContentStatus,
  useUpdateSmmContent,
  useUploadSmmFile,
  useUpsertSmmAnalytics,
} from '../../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../../utils/ui';

export function ContentDetailPage() {
  const { projectId = '', contentId = '' } = useParams();
  const navigate = useNavigate();
  const detail = useSmmContentDetail(contentId);
  const update = useUpdateSmmContent(projectId);
  const transition = useTransitionSmmContentStatus(projectId);
  const archive = useArchiveSmmContent(projectId);
  const duplicate = useDuplicateSmmContent(projectId);
  const replaceBlocks = useReplaceSmmBlocks(projectId);
  const saveTemplate = useSaveSmmContentAsTemplate(projectId);
  const analytics = useSmmContentAnalytics(
    contentId,
    Boolean(
      detail.data &&
        (detail.data.status === SmmContentStatus.PUBLISHED ||
          detail.data.status === SmmContentStatus.ANALYZED),
    ),
  );
  const upsertAnalytics = useUpsertSmmAnalytics(contentId);
  const files = useSmmFiles(projectId, contentId);
  const upload = useUploadSmmFile(projectId);
  const deleteFile = useDeleteSmmFile(projectId);
  const createCost = useCreateSmmCost(projectId);
  const workers = useWorkerLookup('');

  const audience = useSmmAudience(projectId, { pageSize: 100 });
  const personas = useSmmPersonas(projectId, { pageSize: 100 });
  const pillars = useSmmPillars(projectId);
  const campaigns = useSmmCampaigns(projectId);
  const references = useSmmReferences(projectId, { pageSize: 100 });
  const createPillar = useCreateSmmPillar(projectId);
  const createCampaign = useCreateSmmCampaign(projectId);

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [topic, setTopic] = useState('');
  const [hook, setHook] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('');
  const [caption, setCaption] = useState('');
  const [scriptNotes, setScriptNotes] = useState('');
  const [shotList, setShotList] = useState('');
  const [headline, setHeadline] = useState('');
  const [visualBrief, setVisualBrief] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [notes, setNotes] = useState('');
  const [audienceSegmentId, setAudienceSegmentId] = useState('');
  const [personaId, setPersonaId] = useState('');
  const [pillarId, setPillarId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reach, setReach] = useState('');
  const [views, setViews] = useState('');
  const [likes, setLikes] = useState('');
  const [comments, setComments] = useState('');
  const [shares, setShares] = useState('');
  const [saves, setSaves] = useState('');
  const [leads, setLeads] = useState('');
  const [costLabel, setCostLabel] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costUserId, setCostUserId] = useState('');

  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateScope, setTemplateScope] = useState<SmmTemplateScopeType>(SmmTemplateScope.PROJECT);

  useEffect(() => {
    if (!detail.data) return;
    const d = detail.data;
    setTitle(d.title);
    setGoal(d.goal ?? '');
    setTopic(d.topic ?? '');
    setHook(d.hook ?? '');
    setBody(d.body ?? '');
    setCta(d.cta ?? '');
    setCaption(d.caption ?? '');
    setScriptNotes(d.scriptNotes ?? '');
    setShotList(d.shotList ?? '');
    setHeadline(d.headline ?? '');
    setVisualBrief(d.visualBrief ?? '');
    setPublishAt(d.publishAt?.slice(0, 10) ?? '');
    setNotes(d.notes ?? '');
    setAudienceSegmentId(d.audienceSegmentId ?? '');
    setPersonaId(d.personaId ?? '');
    setPillarId(d.pillarId ?? '');
    setCampaignId(d.campaignId ?? '');
    setReferenceId(d.referenceId ?? '');
  }, [detail.data]);

  useEffect(() => {
    if (!analytics.data) return;
    const a = analytics.data;
    setReach(a.reach != null ? String(a.reach) : '');
    setViews(a.views != null ? String(a.views) : '');
    setLikes(a.likes != null ? String(a.likes) : '');
    setComments(a.comments != null ? String(a.comments) : '');
    setShares(a.shares != null ? String(a.shares) : '');
    setSaves(a.saves != null ? String(a.saves) : '');
    setLeads(a.leads != null ? String(a.leads) : '');
  }, [analytics.data]);

  if (detail.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Kontent yuklanmadi"
          message={detail.error instanceof ApiClientError ? detail.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void detail.refetch()}
        />
      </PageContainer>
    );
  }

  if (detail.isLoading || !detail.data) {
    return (
      <PageContainer className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  const item = detail.data;
  const nextStatuses = SMM_CONTENT_STATUS_TRANSITIONS[item.status] ?? [];
  const isReels = item.contentType === SmmContentType.REELS || item.contentType === SmmContentType.VIDEO;
  const isStory = item.contentType === SmmContentType.STORY;
  const isCarousel = item.contentType === SmmContentType.CAROUSEL;
  const showAnalytics =
    item.status === SmmContentStatus.PUBLISHED || item.status === SmmContentStatus.ANALYZED;

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const bodyPayload: UpdateSmmContentItemRequest = {
      title: title.trim(),
      goal: goal.trim() || null,
      topic: topic.trim() || null,
      hook: hook.trim() || null,
      body: body.trim() || null,
      cta: cta.trim() || null,
      caption: caption.trim() || null,
      scriptNotes: scriptNotes.trim() || null,
      shotList: shotList.trim() || null,
      headline: headline.trim() || null,
      visualBrief: visualBrief.trim() || null,
      publishAt: publishAt ? `${publishAt}T12:00:00.000Z` : null,
      notes: notes.trim() || null,
      audienceSegmentId: audienceSegmentId || null,
      personaId: personaId || null,
      pillarId: pillarId || null,
      campaignId: campaignId || null,
      referenceId: referenceId || null,
    };
    try {
      await update.mutateAsync({ contentId, body: bodyPayload });
      setMessage('Saqlandi');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi');
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="space-y-3">
        <Link
          to={ROUTES.smmProjectTab(projectId, 'content')}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Kontent ro‘yxati
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
              <ContentStatusBadge status={item.status} />
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {SMM_CONTENT_TYPE_LABELS[item.contentType]} · {SMM_PLATFORM_LABELS[item.platform]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <WriteGuard
              feature={FeatureKey.SMM_PROJECTS}
              className={BTN_SECONDARY}
              onClick={() =>
                void duplicate.mutateAsync(contentId).then((created) => {
                  navigate(ROUTES.smmContentDetail(projectId, created.id));
                })
              }
            >
              <Copy className="size-4" />
              Nusxa
            </WriteGuard>
            <WriteGuard
              feature={FeatureKey.SMM_PROJECTS}
              className={BTN_SECONDARY}
              onClick={() => {
                setTemplateName(`${item.title} shablon`);
                setTemplateScope(SmmTemplateScope.PROJECT);
                setTemplateOpen(true);
              }}
            >
              <LayoutTemplate className="size-4" />
              Shablon
            </WriteGuard>
            {item.status !== SmmContentStatus.ARCHIVED ? (
              <WriteGuard
                feature={FeatureKey.SMM_PROJECTS}
                className={BTN_SECONDARY}
                onClick={() => {
                  if (window.confirm('Arxivlansinmi?')) void archive.mutateAsync(contentId);
                }}
              >
                Arxivlash
              </WriteGuard>
            ) : null}
          </div>
        </div>

        {nextStatuses.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs text-ink-muted">Holat:</span>
            {nextStatuses.map((status) => (
              <WriteGuard
                key={status}
                feature={FeatureKey.SMM_PROJECTS}
                className={BTN_SECONDARY}
                onClick={() =>
                  void transition
                    .mutateAsync({ contentId, status })
                    .then(() => setMessage(`${SMM_CONTENT_STATUS_LABELS[status]} ga o‘tkazildi`))
                    .catch((err) =>
                      setError(err instanceof ApiClientError ? err.message : 'O‘tkazib bo‘lmadi'),
                    )
                }
              >
                {SMM_CONTENT_STATUS_LABELS[status]}
              </WriteGuard>
            ))}
          </div>
        ) : null}

        {message ? (
          <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
            {message}
          </p>
        ) : null}
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      </div>

      <form className="space-y-4" onSubmit={(e) => void handleSave(e)}>
        <SectionCard title="Asosiy">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-ink-soft">Sarlavha</span>
              <input className={FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Maqsad</span>
              <input className={FIELD_CLASS} value={goal} onChange={(e) => setGoal(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Mavzu</span>
              <input className={FIELD_CLASS} value={topic} onChange={(e) => setTopic(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Nashr sanasi</span>
              <input type="date" className={FIELD_CLASS} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-ink-soft">Caption</span>
              <textarea className={FIELD_CLASS} rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} />
            </label>
          </div>
        </SectionCard>

        <SectionCard
          title="Strategiya bog‘lanishlari"
          description="Auditoriya, persona, pillar, kampaniya va referens"
          action={
            <div className="flex gap-2">
              <WriteGuard
                feature={FeatureKey.SMM_PROJECTS}
                className={BTN_SECONDARY}
                onClick={() => {
                  const name = window.prompt('Pillar nomi');
                  if (!name?.trim()) return;
                  void createPillar
                    .mutateAsync({ name: name.trim() })
                    .then((pillar) => {
                      setPillarId(pillar.id);
                      setMessage('Pillar yaratildi');
                    })
                    .catch((err) =>
                      setError(err instanceof ApiClientError ? err.message : 'Yaratib bo‘lmadi'),
                    );
                }}
              >
                <Plus className="size-4" />
                Pillar
              </WriteGuard>
              <WriteGuard
                feature={FeatureKey.SMM_PROJECTS}
                className={BTN_SECONDARY}
                onClick={() => {
                  const name = window.prompt('Kampaniya nomi');
                  if (!name?.trim()) return;
                  void createCampaign
                    .mutateAsync({ name: name.trim() })
                    .then((campaign) => {
                      setCampaignId(campaign.id);
                      setMessage('Kampaniya yaratildi');
                    })
                    .catch((err) =>
                      setError(err instanceof ApiClientError ? err.message : 'Yaratib bo‘lmadi'),
                    );
                }}
              >
                <Plus className="size-4" />
                Kampaniya
              </WriteGuard>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Auditoriya segmenti</span>
              <select
                className={FIELD_CLASS}
                value={audienceSegmentId}
                onChange={(e) => setAudienceSegmentId(e.target.value)}
              >
                <option value="">—</option>
                {(audience.data?.items ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Persona</span>
              <select className={FIELD_CLASS} value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                <option value="">—</option>
                {(personas.data?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Pillar</span>
              <select className={FIELD_CLASS} value={pillarId} onChange={(e) => setPillarId(e.target.value)}>
                <option value="">—</option>
                {(pillars.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Kampaniya</span>
              <select className={FIELD_CLASS} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                <option value="">—</option>
                {(campaigns.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-ink-soft">Referens</span>
              <select className={FIELD_CLASS} value={referenceId} onChange={(e) => setReferenceId(e.target.value)}>
                <option value="">—</option>
                {(references.data?.items ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </label>
          </div>
        </SectionCard>

        {(isReels || isStory || item.contentType === SmmContentType.POST || isCarousel) && (
          <SectionCard title={isReels ? 'Reels / Video' : isStory ? 'Story' : isCarousel ? 'Karusel' : 'Post'}>
            <div className="grid gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">Hook</span>
                <input className={FIELD_CLASS} value={hook} onChange={(e) => setHook(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">Asosiy matn</span>
                <textarea className={FIELD_CLASS} rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">CTA</span>
                <input className={FIELD_CLASS} value={cta} onChange={(e) => setCta(e.target.value)} />
              </label>
              {isReels ? (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-soft">Skript</span>
                    <textarea className={FIELD_CLASS} rows={4} value={scriptNotes} onChange={(e) => setScriptNotes(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-soft">Shot list</span>
                    <textarea className={FIELD_CLASS} rows={3} value={shotList} onChange={(e) => setShotList(e.target.value)} />
                  </label>
                </>
              ) : null}
              {(item.contentType === SmmContentType.POST || isCarousel) && (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-soft">Sarlavha (headline)</span>
                    <input className={FIELD_CLASS} value={headline} onChange={(e) => setHeadline(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-soft">Vizual brif</span>
                    <textarea className={FIELD_CLASS} rows={2} value={visualBrief} onChange={(e) => setVisualBrief(e.target.value)} />
                  </label>
                </>
              )}
            </div>
          </SectionCard>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Izohlar</span>
          <textarea className={FIELD_CLASS} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <WriteGuard feature={FeatureKey.SMM_PROJECTS} type="submit" className={BTN_PRIMARY} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Saqlash
        </WriteGuard>
      </form>

      <SectionCard title="Bloklar" description={isStory || isCarousel ? 'Slide / segment bloklari' : 'Hook, body, CTA bloklari'}>
        <ContentBlocksEditor
          blocks={item.blocks}
          busy={replaceBlocks.isPending}
          onSave={async (blocks) => {
            await replaceBlocks.mutateAsync({ contentId, blocks });
            setMessage('Bloklar saqlandi');
          }}
        />
      </SectionCard>

      <SectionCard title="Tayinlashlar">
        <ContentAssignmentsPanel projectId={projectId} contentItemId={contentId} />
      </SectionCard>

      <SectionCard title="Tasdiqlash">
        <ApprovalPanel contentId={contentId} />
      </SectionCard>

      {showAnalytics ? (
        <SectionCard title="Analitika" description="Nashrdan keyin qo‘lda kiriting">
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              void upsertAnalytics
                .mutateAsync({
                  reach: reach ? Number(reach) : null,
                  views: views ? Number(views) : null,
                  likes: likes ? Number(likes) : null,
                  comments: comments ? Number(comments) : null,
                  shares: shares ? Number(shares) : null,
                  saves: saves ? Number(saves) : null,
                  leads: leads ? Number(leads) : null,
                  recordedAt: new Date().toISOString(),
                })
                .then(() => setMessage('Analitika saqlandi'))
                .catch((err) =>
                  setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi'),
                );
            }}
          >
            {[
              ['Reach', reach, setReach],
              ['Views', views, setViews],
              ['Likes', likes, setLikes],
              ['Comments', comments, setComments],
              ['Shares', shares, setShares],
              ['Saves', saves, setSaves],
              ['Leads', leads, setLeads],
            ].map(([label, value, setter]) => (
              <label key={String(label)} className="block text-sm">
                <span className="mb-1 block text-ink-soft">{label as string}</span>
                <input
                  className={FIELD_CLASS}
                  inputMode="numeric"
                  value={value as string}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                />
              </label>
            ))}
            <div className="sm:col-span-3">
              <button type="submit" className={BTN_PRIMARY} disabled={upsertAnalytics.isPending}>
                Analitikani saqlash
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title="Xarajat">
        <form
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            const money = parseMoneyInput(costAmount);
            if (!costLabel.trim() || money === null) {
              setError('Xarajat maydonlarini to‘ldiring');
              return;
            }
            void createCost
              .mutateAsync({
                label: costLabel.trim(),
                amount: money,
                costDate: new Date().toISOString().slice(0, 10),
                contentItemId: contentId,
                userId: costUserId || null,
              })
              .then(() => {
                setCostLabel('');
                setCostAmount('');
                setCostUserId('');
                setMessage(`Xarajat qo‘shildi (${formatMoney(money)})`);
              })
              .catch((err) =>
                setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi'),
              );
          }}
        >
          <input className={FIELD_CLASS} placeholder="Nomi" value={costLabel} onChange={(e) => setCostLabel(e.target.value)} />
          <input className={FIELD_CLASS} inputMode="numeric" placeholder="Summa" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} />
          <select className={FIELD_CLASS} value={costUserId} onChange={(e) => setCostUserId(e.target.value)}>
            <option value="">Xodim (ixtiyoriy)</option>
            {(workers.data ?? []).map((w) => (
              <option key={w.id} value={w.id}>{w.fullName}</option>
            ))}
          </select>
          <button type="submit" className={BTN_PRIMARY} disabled={createCost.isPending}>
            Qo‘shish
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Fayllar"
        action={
          <label className={BTN_SECONDARY}>
            Yuklash
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void upload
                  .mutateAsync({ file, contentItemId: contentId })
                  .then(() => setMessage('Fayl yuklandi'))
                  .catch((err) =>
                    setError(err instanceof ApiClientError ? err.message : 'Yuklab bo‘lmadi'),
                  );
                e.target.value = '';
              }}
            />
          </label>
        }
      >
        {(files.data ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">Fayl yo‘q</p>
        ) : (
          <ul className="divide-y divide-line">
            {(files.data ?? []).map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-2 py-2">
                <a href={file.fileUrl} target="_blank" rel="noreferrer" className="truncate text-sm text-brand-700 hover:underline">
                  {file.fileName}
                </a>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  onClick={() => void deleteFile.mutateAsync(file.id)}
                >
                  O‘chirish
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog open={templateOpen} onClose={() => setTemplateOpen(false)} title="Shablon sifatida saqlash">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!templateName.trim()) {
              setError('Shablon nomi majburiy');
              return;
            }
            void saveTemplate
              .mutateAsync({
                contentId,
                name: templateName.trim(),
                scope: templateScope,
              })
              .then(() => {
                setTemplateOpen(false);
                setMessage('Shablon saqlandi');
              })
              .catch((err) =>
                setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi'),
              );
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Nomi</span>
            <input
              className={FIELD_CLASS}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm text-ink-soft">Doira</legend>
            {(Object.values(SmmTemplateScope) as SmmTemplateScopeType[]).map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="template-scope"
                  checked={templateScope === scope}
                  onChange={() => setTemplateScope(scope)}
                />
                {SMM_TEMPLATE_SCOPE_LABELS[scope]}
              </label>
            ))}
          </fieldset>
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setTemplateOpen(false)}>
              Bekor
            </button>
            <button type="submit" className={BTN_PRIMARY} disabled={saveTemplate.isPending}>
              {saveTemplate.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Saqlash
            </button>
          </div>
        </form>
      </Dialog>
    </PageContainer>
  );
}

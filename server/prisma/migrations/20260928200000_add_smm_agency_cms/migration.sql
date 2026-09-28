-- Additive: SMM Agency Project Content Management (Balancy.Space).
-- Safe / reversible: DROP TABLE in reverse order + DROP TYPE. No destructive alters.

-- CreateEnum
CREATE TYPE "SmmProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SmmProjectMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'CONTENT_MANAGER', 'EDITOR', 'DESIGNER', 'VIDEOGRAPHER', 'COPYWRITER', 'CLIENT');

-- CreateEnum
CREATE TYPE "SmmInsightSource" AS ENUM ('CLIENT_INTERVIEW', 'CUSTOMER_DATA', 'INSTAGRAM_INSIGHTS', 'ADVERTISING_DATA', 'COMPETITOR_RESEARCH', 'CUSTOMER_INTERVIEW', 'COMMENTS', 'DM', 'MARKET_RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "SmmPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'YOUTUBE', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "SmmContentType" AS ENUM ('REELS', 'STORY', 'POST', 'CAROUSEL', 'VIDEO', 'AD');

-- CreateEnum
CREATE TYPE "SmmContentStatus" AS ENUM ('IDEA', 'PLANNED', 'BRIEF', 'SCRIPT_COPY', 'PRODUCTION', 'INTERNAL_REVIEW', 'CLIENT_REVIEW', 'REVISION', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ANALYZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SmmAssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SmmTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SmmApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SmmTemplateScope" AS ENUM ('PROJECT', 'AGENCY');

-- CreateEnum
CREATE TYPE "SmmBlockKind" AS ENUM ('HOOK', 'BODY', 'CTA', 'PROBLEM', 'SOLUTION', 'SOCIAL_PROOF', 'VISUAL', 'TEXT', 'PRODUCT', 'HEADLINE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SmmFileKind" AS ENUM ('VIDEO', 'IMAGE', 'DESIGN', 'SCRIPT', 'REFERENCE', 'OTHER');

-- AlterEnum
ALTER TYPE "BusinessType" ADD VALUE 'SMM';

-- CreateTable
CREATE TABLE "smm_projects" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT,
    "clientUserId" TEXT,
    "description" TEXT,
    "status" "SmmProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "budgetPlanned" BIGINT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SmmProjectMemberRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_audience_segments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageRange" TEXT,
    "gender" TEXT,
    "location" TEXT,
    "income" TEXT,
    "occupation" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "painPoints" TEXT,
    "needs" TEXT,
    "desires" TEXT,
    "objections" TEXT,
    "buyingMotivation" TEXT,
    "buyingBehavior" TEXT,
    "contentPreferences" TEXT,
    "researchSources" TEXT,
    "notes" TEXT,
    "insights" JSONB NOT NULL DEFAULT '[]',
    "archivedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_audience_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_personas" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "segmentId" TEXT,
    "name" TEXT NOT NULL,
    "ageRange" TEXT,
    "gender" TEXT,
    "location" TEXT,
    "occupation" TEXT,
    "income" TEXT,
    "problems" TEXT,
    "needs" TEXT,
    "motivation" TEXT,
    "objections" TEXT,
    "preferredContent" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_competitors" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "SmmPlatform" NOT NULL,
    "profileUrl" TEXT,
    "followers" INTEGER,
    "postingFrequency" TEXT,
    "contentFormats" TEXT,
    "engagement" TEXT,
    "offers" TEXT,
    "pricing" TEXT,
    "positioning" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "bestContent" TEXT,
    "hooks" TEXT,
    "notes" TEXT,
    "researchDate" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_references" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "SmmPlatform" NOT NULL,
    "sourceUrl" TEXT,
    "contentType" "SmmContentType" NOT NULL,
    "creatorName" TEXT,
    "topic" TEXT,
    "hook" TEXT,
    "format" TEXT,
    "goal" TEXT,
    "whySaved" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "mediaKey" TEXT,
    "mediaUrl" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_pillars" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_pillars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_campaigns" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "goal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_plans" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "platforms" JSONB NOT NULL,
    "frequencyNotes" TEXT,
    "contentTypes" JSONB NOT NULL,
    "pillarIds" JSONB,
    "goals" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_plan_slots" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "contentType" "SmmContentType" NOT NULL,
    "platform" "SmmPlatform",
    "title" TEXT,
    "notes" TEXT,
    "contentItemId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_plan_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_templates" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "projectId" TEXT,
    "scope" "SmmTemplateScope" NOT NULL,
    "name" TEXT NOT NULL,
    "contentType" "SmmContentType" NOT NULL,
    "description" TEXT,
    "payload" JSONB NOT NULL,
    "createdById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "campaignId" TEXT,
    "platform" "SmmPlatform" NOT NULL,
    "contentType" "SmmContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "publishAt" TIMESTAMP(3),
    "goal" TEXT,
    "topic" TEXT,
    "expectedResult" TEXT,
    "audienceSegmentId" TEXT,
    "personaId" TEXT,
    "pillarId" TEXT,
    "status" "SmmContentStatus" NOT NULL DEFAULT 'IDEA',
    "referenceId" TEXT,
    "notes" TEXT,
    "format" TEXT,
    "hook" TEXT,
    "body" TEXT,
    "cta" TEXT,
    "caption" TEXT,
    "scriptNotes" TEXT,
    "shotList" TEXT,
    "productionNotes" TEXT,
    "headline" TEXT,
    "visualBrief" TEXT,
    "extras" JSONB,
    "createdById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_blocks" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "kind" "SmmBlockKind" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "visualDirection" TEXT,
    "referenceText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_assignments" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "responsibility" TEXT,
    "deadline" TIMESTAMP(3),
    "status" "SmmAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_tasks" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contentItemId" TEXT,
    "assignmentId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SmmTaskStatus" NOT NULL DEFAULT 'PENDING',
    "deadline" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_costs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contentItemId" TEXT,
    "taskId" TEXT,
    "userId" TEXT,
    "label" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "costDate" DATE NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_analytics" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "reach" INTEGER,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "engagement" DOUBLE PRECISION,
    "profileVisits" INTEGER,
    "leads" INTEGER,
    "conversions" INTEGER,
    "sales" INTEGER,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_approvals" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "decision" "SmmApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewerRole" TEXT,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_content_files" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT,
    "projectId" TEXT NOT NULL,
    "kind" "SmmFileKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_content_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_activities" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "smm_projects_storeId_status_idx" ON "smm_projects"("storeId", "status");

-- CreateIndex
CREATE INDEX "smm_projects_storeId_createdAt_idx" ON "smm_projects"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "smm_projects_clientUserId_idx" ON "smm_projects"("clientUserId");

-- CreateIndex
CREATE INDEX "smm_projects_createdById_idx" ON "smm_projects"("createdById");

-- CreateIndex
CREATE INDEX "smm_project_members_userId_isActive_idx" ON "smm_project_members"("userId", "isActive");

-- CreateIndex
CREATE INDEX "smm_project_members_projectId_role_idx" ON "smm_project_members"("projectId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "smm_project_members_projectId_userId_key" ON "smm_project_members"("projectId", "userId");

-- CreateIndex
CREATE INDEX "smm_audience_segments_projectId_archivedAt_idx" ON "smm_audience_segments"("projectId", "archivedAt");

-- CreateIndex
CREATE INDEX "smm_audience_segments_projectId_sortOrder_idx" ON "smm_audience_segments"("projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "smm_personas_projectId_archivedAt_idx" ON "smm_personas"("projectId", "archivedAt");

-- CreateIndex
CREATE INDEX "smm_personas_segmentId_idx" ON "smm_personas"("segmentId");

-- CreateIndex
CREATE INDEX "smm_competitors_projectId_archivedAt_idx" ON "smm_competitors"("projectId", "archivedAt");

-- CreateIndex
CREATE INDEX "smm_competitors_projectId_platform_idx" ON "smm_competitors"("projectId", "platform");

-- CreateIndex
CREATE INDEX "smm_content_references_projectId_archivedAt_idx" ON "smm_content_references"("projectId", "archivedAt");

-- CreateIndex
CREATE INDEX "smm_content_references_projectId_platform_idx" ON "smm_content_references"("projectId", "platform");

-- CreateIndex
CREATE INDEX "smm_content_references_projectId_contentType_idx" ON "smm_content_references"("projectId", "contentType");

-- CreateIndex
CREATE INDEX "smm_content_pillars_projectId_archivedAt_idx" ON "smm_content_pillars"("projectId", "archivedAt");

-- CreateIndex
CREATE INDEX "smm_content_pillars_projectId_sortOrder_idx" ON "smm_content_pillars"("projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "smm_campaigns_projectId_archivedAt_idx" ON "smm_campaigns"("projectId", "archivedAt");

-- CreateIndex
CREATE INDEX "smm_campaigns_projectId_status_idx" ON "smm_campaigns"("projectId", "status");

-- CreateIndex
CREATE INDEX "smm_content_plans_projectId_periodStart_idx" ON "smm_content_plans"("projectId", "periodStart");

-- CreateIndex
CREATE INDEX "smm_content_plan_slots_planId_date_idx" ON "smm_content_plan_slots"("planId", "date");

-- CreateIndex
CREATE INDEX "smm_content_plan_slots_contentItemId_idx" ON "smm_content_plan_slots"("contentItemId");

-- CreateIndex
CREATE INDEX "smm_content_templates_storeId_scope_archivedAt_idx" ON "smm_content_templates"("storeId", "scope", "archivedAt");

-- CreateIndex
CREATE INDEX "smm_content_templates_projectId_idx" ON "smm_content_templates"("projectId");

-- CreateIndex
CREATE INDEX "smm_content_templates_createdById_idx" ON "smm_content_templates"("createdById");

-- CreateIndex
CREATE INDEX "smm_content_items_projectId_status_idx" ON "smm_content_items"("projectId", "status");

-- CreateIndex
CREATE INDEX "smm_content_items_projectId_platform_idx" ON "smm_content_items"("projectId", "platform");

-- CreateIndex
CREATE INDEX "smm_content_items_projectId_contentType_idx" ON "smm_content_items"("projectId", "contentType");

-- CreateIndex
CREATE INDEX "smm_content_items_projectId_publishAt_idx" ON "smm_content_items"("projectId", "publishAt");

-- CreateIndex
CREATE INDEX "smm_content_items_projectId_archivedAt_idx" ON "smm_content_items"("projectId", "archivedAt");

-- CreateIndex
CREATE INDEX "smm_content_items_campaignId_idx" ON "smm_content_items"("campaignId");

-- CreateIndex
CREATE INDEX "smm_content_items_audienceSegmentId_idx" ON "smm_content_items"("audienceSegmentId");

-- CreateIndex
CREATE INDEX "smm_content_items_personaId_idx" ON "smm_content_items"("personaId");

-- CreateIndex
CREATE INDEX "smm_content_items_pillarId_idx" ON "smm_content_items"("pillarId");

-- CreateIndex
CREATE INDEX "smm_content_items_referenceId_idx" ON "smm_content_items"("referenceId");

-- CreateIndex
CREATE INDEX "smm_content_items_createdById_idx" ON "smm_content_items"("createdById");

-- CreateIndex
CREATE INDEX "smm_content_blocks_contentItemId_sortOrder_idx" ON "smm_content_blocks"("contentItemId", "sortOrder");

-- CreateIndex
CREATE INDEX "smm_content_assignments_contentItemId_status_idx" ON "smm_content_assignments"("contentItemId", "status");

-- CreateIndex
CREATE INDEX "smm_content_assignments_userId_status_idx" ON "smm_content_assignments"("userId", "status");

-- CreateIndex
CREATE INDEX "smm_content_assignments_deadline_idx" ON "smm_content_assignments"("deadline");

-- CreateIndex
CREATE INDEX "smm_content_tasks_storeId_status_idx" ON "smm_content_tasks"("storeId", "status");

-- CreateIndex
CREATE INDEX "smm_content_tasks_projectId_status_idx" ON "smm_content_tasks"("projectId", "status");

-- CreateIndex
CREATE INDEX "smm_content_tasks_userId_status_idx" ON "smm_content_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "smm_content_tasks_contentItemId_idx" ON "smm_content_tasks"("contentItemId");

-- CreateIndex
CREATE INDEX "smm_content_tasks_assignmentId_idx" ON "smm_content_tasks"("assignmentId");

-- CreateIndex
CREATE INDEX "smm_content_tasks_deadline_idx" ON "smm_content_tasks"("deadline");

-- CreateIndex
CREATE INDEX "smm_content_costs_projectId_costDate_idx" ON "smm_content_costs"("projectId", "costDate");

-- CreateIndex
CREATE INDEX "smm_content_costs_contentItemId_idx" ON "smm_content_costs"("contentItemId");

-- CreateIndex
CREATE INDEX "smm_content_costs_taskId_idx" ON "smm_content_costs"("taskId");

-- CreateIndex
CREATE INDEX "smm_content_costs_userId_idx" ON "smm_content_costs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "smm_content_analytics_contentItemId_key" ON "smm_content_analytics"("contentItemId");

-- CreateIndex
CREATE INDEX "smm_content_analytics_recordedById_idx" ON "smm_content_analytics"("recordedById");

-- CreateIndex
CREATE INDEX "smm_content_approvals_contentItemId_decision_idx" ON "smm_content_approvals"("contentItemId", "decision");

-- CreateIndex
CREATE INDEX "smm_content_approvals_reviewerId_idx" ON "smm_content_approvals"("reviewerId");

-- CreateIndex
CREATE INDEX "smm_content_files_projectId_kind_idx" ON "smm_content_files"("projectId", "kind");

-- CreateIndex
CREATE INDEX "smm_content_files_contentItemId_idx" ON "smm_content_files"("contentItemId");

-- CreateIndex
CREATE INDEX "smm_content_files_uploadedById_idx" ON "smm_content_files"("uploadedById");

-- CreateIndex
CREATE INDEX "smm_activities_projectId_createdAt_idx" ON "smm_activities"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "smm_activities_projectId_entityType_entityId_idx" ON "smm_activities"("projectId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "smm_activities_actorUserId_idx" ON "smm_activities"("actorUserId");

-- AddForeignKey
ALTER TABLE "smm_projects" ADD CONSTRAINT "smm_projects_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_projects" ADD CONSTRAINT "smm_projects_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_projects" ADD CONSTRAINT "smm_projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_project_members" ADD CONSTRAINT "smm_project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_project_members" ADD CONSTRAINT "smm_project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_audience_segments" ADD CONSTRAINT "smm_audience_segments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_personas" ADD CONSTRAINT "smm_personas_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_personas" ADD CONSTRAINT "smm_personas_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "smm_audience_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_competitors" ADD CONSTRAINT "smm_competitors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_references" ADD CONSTRAINT "smm_content_references_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_pillars" ADD CONSTRAINT "smm_content_pillars_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_campaigns" ADD CONSTRAINT "smm_campaigns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_plans" ADD CONSTRAINT "smm_content_plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_plan_slots" ADD CONSTRAINT "smm_content_plan_slots_planId_fkey" FOREIGN KEY ("planId") REFERENCES "smm_content_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_plan_slots" ADD CONSTRAINT "smm_content_plan_slots_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "smm_content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_templates" ADD CONSTRAINT "smm_content_templates_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_templates" ADD CONSTRAINT "smm_content_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_templates" ADD CONSTRAINT "smm_content_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_items" ADD CONSTRAINT "smm_content_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_items" ADD CONSTRAINT "smm_content_items_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "smm_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_items" ADD CONSTRAINT "smm_content_items_audienceSegmentId_fkey" FOREIGN KEY ("audienceSegmentId") REFERENCES "smm_audience_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_items" ADD CONSTRAINT "smm_content_items_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "smm_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_items" ADD CONSTRAINT "smm_content_items_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "smm_content_pillars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_items" ADD CONSTRAINT "smm_content_items_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "smm_content_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_items" ADD CONSTRAINT "smm_content_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_blocks" ADD CONSTRAINT "smm_content_blocks_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "smm_content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_assignments" ADD CONSTRAINT "smm_content_assignments_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "smm_content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_assignments" ADD CONSTRAINT "smm_content_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_tasks" ADD CONSTRAINT "smm_content_tasks_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_tasks" ADD CONSTRAINT "smm_content_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_tasks" ADD CONSTRAINT "smm_content_tasks_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "smm_content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_tasks" ADD CONSTRAINT "smm_content_tasks_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "smm_content_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_tasks" ADD CONSTRAINT "smm_content_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_tasks" ADD CONSTRAINT "smm_content_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_costs" ADD CONSTRAINT "smm_content_costs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_costs" ADD CONSTRAINT "smm_content_costs_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "smm_content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_costs" ADD CONSTRAINT "smm_content_costs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "smm_content_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_costs" ADD CONSTRAINT "smm_content_costs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_costs" ADD CONSTRAINT "smm_content_costs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_analytics" ADD CONSTRAINT "smm_content_analytics_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "smm_content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_analytics" ADD CONSTRAINT "smm_content_analytics_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_approvals" ADD CONSTRAINT "smm_content_approvals_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "smm_content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_approvals" ADD CONSTRAINT "smm_content_approvals_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_files" ADD CONSTRAINT "smm_content_files_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "smm_content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_files" ADD CONSTRAINT "smm_content_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_content_files" ADD CONSTRAINT "smm_content_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_activities" ADD CONSTRAINT "smm_activities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smm_activities" ADD CONSTRAINT "smm_activities_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

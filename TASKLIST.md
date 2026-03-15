# Synorq Product Delivery Task List

Bu liste Synorq'u "PM shell" seviyesinden "delivery control system" seviyesine tasimak icin eksiksiz backlog olarak tutulur.

## Phase 0: Alignment and Foundations

- [x] Demo seed verisi olusturuldu ve calistirilabilir hale getirildi
- [x] Dashboard aksiyon odakli delivery control surface'e donusturuldu
- [x] Projects ekranina richer cards, portfolio summary ve table view eklendi
- [x] Kanban task card'lari priority, label, due-date ve signal alanlariyla guclendirildi
- [x] SaaS shell topbar/sidebar daha kompakt hale getirildi
- [x] Proje veri modeli genisletildi
  - [x] Client/company entity
  - [x] Project owner
  - [x] Project type
  - [x] Project priority
  - [x] Project tags
  - [x] Visibility/access strategy
  - [x] Health score persistence or derived strategy
- [x] Milestone veri modeli eklenecek
- [x] Risk register veri modeli eklenecek
- [x] Team capacity/workload veri modeli eklenecek
- [ ] Audit event taxonomy genisletilecek
  - [x] project.created
  - [x] project.updated
  - [x] task.deleted
  - [x] task.assignee_changed
  - [x] task.due_date_changed
  - [x] risk.created / updated
  - [x] milestone.created / updated
  - [x] workspace.member.capacity_updated
  - [x] workspace.preference_changed
  - [x] export.created
- [ ] Ortak analytics helpers genisletilecek
  - [ ] portfolio health
  - [ ] team workload
  - [x] milestone progress
  - [x] risk severity
  - [ ] weekly reporting metrics

## Phase 1: Core P0 Product Surfaces

- [ ] Dashboard ikinci iterasyon
  - [x] Quick actions bar
  - [x] Upcoming deadlines timeline
  - [x] Recent blockers
  - [x] Client risk visibility
  - [x] Weekly completion trend chart
- [ ] Notifications Center yeniden tasarlanacak
  - [x] Action Required tab
  - [x] Activity tab
  - [x] Digest tab
  - [x] filters: mine / risk / project updates / mention
  - [x] bulk actions
  - [x] read-unread state
  - [x] archive
  - [x] snooze
  - [x] notification rule controls
- [ ] Projects portfolio ikinci iterasyon
  - [x] owner/client/type alanlari gosterilecek
  - [x] saved views kalici hale getirilecek
  - [x] portfolio risk trend
  - [x] owner-based distribution
  - [x] milestone progress
  - [x] workload summary
- [x] New project flow wizard olarak yeniden yazildi
  - [x] Step 1: Basic information
  - [x] Step 2: Team and template
  - [x] Step 3: Goals and delivery
  - [x] Template-based project setup
  - [x] Starter tasks auto-generation
- [ ] My Tasks ekraninin execution inbox seviyesine cikmasi
  - [x] today
  - [x] overdue
  - [x] review waiting
  - [x] blocked
  - [x] recently completed
  - [x] personal workload summary
  - [x] filters and saved segments
- [ ] Audit / Activity ekraninin enterprise timeline'a donusmesi
  - [x] actor filter
  - [x] entity filter
  - [x] severity filter
  - [x] date range filter
  - [x] diff preview
  - [x] export CSV / JSON
- [ ] Settings ekraninin tabbed console'a donusmesi
  - [x] Workspace
  - [x] Profile
  - [x] Team
  - [x] Permissions
  - [x] Notifications
  - [x] Integrations
  - [x] Billing
  - [x] Security
- [ ] Project detail sayfasi yeniden yapilandirilacak
  - [x] Overview
  - [x] Board
  - [x] List
  - [x] Timeline
  - [x] Files
  - [x] Activity
  - [x] Risks
  - [x] Settings

## Phase 2: P1 Strategic Modules

- [x] Milestones / Timeline modulu
  - [x] milestone CRUD
  - [x] linked tasks
  - [x] owner and due date
  - [x] milestone progress
  - [x] timeline visualization
- [x] Risks modulu
  - [x] risk register list
  - [x] impact / likelihood scoring
  - [x] mitigation plan
  - [x] owner / due date
  - [x] linked project and tasks
  - [x] status workflow
- [x] Team capacity module
  - [x] active load by user
  - [x] due-date density
  - [x] weekly capacity
  - [x] workload heatmap
  - [x] overloaded / underloaded signals
- [ ] Reports modulu
  - [x] weekly status report
  - [x] portfolio risk report
  - [x] team workload report
  - [x] delivery performance report
  - [x] shareable summary view
- [ ] Smart onboarding flow
  - [x] guided checklist
  - [x] demo workspace state
  - [x] create-first-project flow
  - [x] add-team-member flow
  - [x] save-first-view flow
- [ ] Global command/search center
  - [x] project search
  - [x] task search
  - [x] people search
  - [x] commands
  - [x] quick navigation

## Phase 3: P2 Growth Modules

- [ ] Client/company layer
  - [ ] client health
  - [ ] client owner
  - [ ] project-to-client relationship
  - [ ] notes / contract / retainer fields
- [ ] Client-facing portal groundwork
- [ ] Billing / plan / usage controls
- [ ] Integrations
  - [ ] Slack
  - [ ] Google Calendar
  - [ ] Webhooks / API keys
- [ ] Automations engine
- [ ] Executive weekly digest
- [ ] AI-assisted summaries

## Information Architecture

- [ ] Main nav target
  - [x] Dashboard
  - [x] Projects
  - [x] Tasks
  - [x] Timeline
  - [x] Risks
  - [x] Team
  - [x] Activity
  - [x] Reports
  - [x] Settings
- [x] Project nav target
  - [x] Overview
  - [x] Board
  - [x] List
  - [x] Timeline
  - [x] Files
  - [x] Activity
  - [x] Risks
  - [x] Settings

## Delivery Order

1. Project metadata foundation + create wizard
2. Notifications center redesign
3. Project detail information architecture
4. Audit/activity expansion
5. My Tasks execution inbox upgrade
6. Settings tabbed console
7. Milestones
8. Risks
9. Team capacity
10. Reports and command center

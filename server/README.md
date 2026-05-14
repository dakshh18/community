You are an expert full-stack TypeScript developer.

Build a production-quality MVP mobile app for a local community living in Vadodara. The community has around 400–500 people originally from the same native place. They currently manage member details, professions, family details, meetings, payments, and events manually using WhatsApp, Google Sheets, and pen-paper.

I know React.js, React Native, Node.js, and TypeScript, so use a stack that I can understand and maintain.

Tech stack:
- Mobile app: React Native with Expo
- Language: TypeScript
- Backend: Node.js + Express.js or NestJS, preferably Express if simpler
- Database: PostgreSQL preferred, but SQLite is acceptable for local MVP using Prisma ORM
- ORM: Prisma
- Authentication: Phone number + OTP style flow for UI, but for MVP implement mock OTP/login
- State management: React Query or Zustand
- Styling: Clean modern UI, reusable components
- Validation: Zod
- API format: REST API
- Role-based access: Admin, Committee Member, Normal Member

Important privacy requirement:
This app stores personal data like name, phone number, address, profession, family members, and payment status. Do not make all data public. Only logged-in verified community members should access the directory. Admin should be able to control which fields are visible. Members should be able to hide sensitive fields like address or phone number.

App name:
"Samaj Connect" or "Community Connect"

Main problem:
Our community wants to stay connected, help each other, find people by profession, and manage community events like Snehmilan, dinner, kids performances, and family payments.

Core modules:

1. Authentication and onboarding
- Login using phone number
- Mock OTP verification for MVP
- User can complete profile after login
- Admin can approve or reject new members
- Only approved members can access the main app

2. Member directory
Members should be searchable and filterable.
Fields:
- Full name
- Native village/place
- Current city, default Vadodara
- Phone number
- Alternate phone number
- Address
- Profession
- Business/company name
- Skills/services
- Blood group
- Family members
- Notes
- Visibility settings for phone/address
- Profile photo optional
- Approval status

Features:
- Search members by name, profession, city, skills, business, or blood group
- Example: if I search "doctor", show a list of all doctors
- Show member cards with name, profession, area, and contact shortcut
- On clicking a card, show detail page with allowed details
- Add quick actions: call, WhatsApp, save contact
- Filter by profession: Doctor, Teacher, Business, Student, Engineer, etc.
- Admin can add/edit/delete members
- Admin can import members from CSV/Excel exported from Google Sheets

3. Family management
Each main member can have family members.
Family member fields:
- Name
- Age
- Relation
- Gender
- Occupation/student
- Participating in event: yes/no

4. Community help feature
Purpose: If someone needs help, they can find the right person from the community.
Features:
- Search by help category: Medical, Education, Job, Business, Legal, Emergency, Blood Donation
- Show matching people from directory
- Add "Can help with" tags to profiles
- Optional "Request Help" form:
  - Help category
  - Short description
  - Urgency level
  - Contact preference
- Admin/committee can view help requests

5. Event management — Snehmilan
The community organizes events like Snehmilan where each family pays ₹1000 and attends dinner, kids performance, speech, act, dance, etc.

Event fields:
- Event name
- Date and time
- Venue
- Description
- Contribution amount per family, example ₹1000
- Registration open/closed
- Created by admin

Features:
- Admin can create event
- Members can register their family
- Add number of family members attending
- Add kids performance details:
  - Child name
  - Performance type: Dance, Act, Speech, Singing, Other
  - Song/topic/title
  - Duration
  - Notes
- Show event dashboard:
  - Total families registered
  - Total people attending
  - Total expected collection
  - Total collected amount
  - Pending payments
  - Total expenses
  - Remaining balance

6. Payment management
For MVP, implement manual payment tracking. Do not integrate real payment gateway yet.

Payment fields:
- Event
- Member/family
- Amount due
- Amount paid
- Payment mode: Cash, UPI, Bank Transfer, Other
- Payment status: Pending, Partial, Paid
- Transaction/reference number
- Collected by
- Payment date
- Notes

Features:
- Admin/committee can mark payment as paid
- Member can see their own payment status
- Admin can filter:
  - Paid families
  - Pending families
  - Partial payments
- Generate collection summary
- Export payment report as CSV

7. Expense management
For events, admin should manage expenses.

Expense fields:
- Event
- Category: Food, Venue, Decoration, Sound, Gifts, Printing, Misc
- Amount
- Paid to
- Paid by
- Date
- Notes
- Bill photo optional for future

Features:
- Add/edit/delete expenses
- Show total expense
- Show collection minus expense balance

8. Admin dashboard
Admin should see:
- Total members
- Pending approvals
- Members by profession
- Event collection summary
- Pending payments
- Upcoming events
- Recent help requests

9. Committee dashboard
Committee members can:
- View member directory
- Manage event registrations
- Update payment status
- View reports
But only Admin can delete members, change roles, or import CSV.

10. Reports
Add simple reports:
- Member list CSV export
- Event registration CSV export
- Payment pending CSV export
- Payment collected CSV export
- Expense report CSV export

11. Notifications placeholder
For MVP, add notification data model and UI placeholder only.
Future features:
- WhatsApp reminder
- Push notification
- SMS reminders

Database models required:
- User
- MemberProfile
- FamilyMember
- ProfessionCategory
- HelpRequest
- Event
- EventRegistration
- Performance
- Payment
- Expense
- Notification
- AuditLog

Use Prisma schema with proper relations.

Create seed data:
- 20 sample members
- Include professions like Doctor, Teacher, Engineer, Business Owner, Student, Lawyer
- Include 2 events, one called "Snehmilan 2026"
- Include sample payments, pending payments, expenses, and performances

Mobile app screens:
1. Splash screen
2. Login screen
3. OTP verification screen
4. Profile completion screen
5. Pending approval screen
6. Home dashboard
7. Member directory screen
8. Member search/filter screen
9. Member detail screen
10. Add/edit member screen for admin
11. Help categories screen
12. Create help request screen
13. Event list screen
14. Event detail screen
15. Event registration screen
16. Kids performance registration screen
17. My payment status screen
18. Admin event dashboard
19. Payment collection screen
20. Expense management screen
21. Reports screen
22. Settings/privacy screen

UI expectations:
- Simple and clean
- Indian community-friendly design
- Large readable text
- Search should be very easy
- Member cards should be clear
- Use icons where useful
- Bottom tab navigation:
  - Home
  - Directory
  - Events
  - Help
  - Profile
- Admin users should see extra admin actions

Backend API requirements:
Create REST APIs for:
- Auth mock login
- Member CRUD
- Member approval
- Search/filter members
- Family member CRUD
- Help request CRUD
- Event CRUD
- Event registration CRUD
- Performance CRUD
- Payment CRUD
- Expense CRUD
- Reports CSV export
- Dashboard stats

Security:
- Add JWT-based auth
- Add role-based middleware
- Validate all request bodies using Zod
- Never expose hidden private fields unless requester is admin
- Add audit logs for admin actions

Deliverables:
- Complete project structure
- Backend folder
- Mobile app folder
- Prisma schema
- Seed script
- API routes
- React Native screens
- Reusable components
- Basic error handling
- README with setup instructions

Development style:
- First create the database schema and backend APIs
- Then create the React Native screens
- Then connect APIs
- Keep code modular and readable
- Use TypeScript strictly
- Add comments where business logic is important
- Use environment variables
- Include clear instructions for running locally

MVP priority:
Phase 1:
- Auth mock login
- Member directory
- Search by profession
- Member detail page
- Admin member import/add/edit
- Event creation
- Event registration
- Manual payment tracking
- Basic dashboard

Phase 2:
- Help requests
- Expenses
- Reports
- Performance registration

Phase 3:
- Real OTP
- Push notifications
- Razorpay/UPI payment integration
- WhatsApp reminders
- Bill uploads

Start by generating the complete folder structure, Prisma schema, backend setup, and seed data. Then continue implementing the screens and APIs step by step.



Important change in authentication and member onboarding:

We already have an Excel sheet containing all member and family information. Members should NOT manually create their full profile from scratch.

The app should work like this:

1. Admin imports the Excel sheet into the database.
2. The Excel sheet contains member details like:
   - Full name
   - Phone number
   - Address
   - Native place
   - Current city
   - Profession
   - Business/company
   - Family members
   - Blood group
   - Notes
   - Any other available columns

3. After data import, members can login using their registered phone number.
4. During login:
   - User enters phone number
   - Backend checks whether this phone number exists in the MemberProfile table
   - If phone number exists, send/mock OTP and allow login
   - If phone number does not exist, show:
     "Your number is not registered in community records. Please contact admin."
5. Once logged in, the user is connected to their existing imported profile.
6. User can view their own profile and request corrections if data is wrong.
7. Normal users should not directly edit important data like name, profession, address, or family details unless admin allows it.
8. Admin can approve profile correction requests.
9. Admin can edit any member profile.

Excel import requirements:
- Build an admin-only Excel/CSV import feature.
- Admin can upload .xlsx or .csv file.
- Backend should parse the file and insert/update members in the database.
- Use phone number as the main unique identifier.
- Normalize phone numbers before saving.
  Example:
  - 9876543210
  - +91 9876543210
  - 91-9876543210
  should be treated as the same number.
- If a phone number already exists, update that member instead of creating duplicate.
- If a row has missing phone number, mark it as invalid and show it in import error report.
- After import, show summary:
  - Total rows processed
  - New members created
  - Existing members updated
  - Invalid rows
  - Duplicate rows
- Allow admin to download failed rows as CSV.

Database changes:
- MemberProfile should be the main source of truth.
- User account should be created only when a member logs in for the first time.
- User should be linked to MemberProfile using phone number/memberProfileId.

Suggested models:

User:
- id
- phoneNumber
- role: ADMIN, COMMITTEE, MEMBER
- memberProfileId
- isActive
- lastLoginAt
- createdAt
- updatedAt

MemberProfile:
- id
- fullName
- phoneNumber
- alternatePhoneNumber
- address
- area
- city
- nativePlace
- profession
- businessName
- skills
- bloodGroup
- notes
- showPhoneNumber
- showAddress
- importedFromSheet
- importBatchId
- createdAt
- updatedAt

FamilyMember:
- id
- memberProfileId
- name
- relation
- age
- gender
- occupation
- createdAt
- updatedAt

ImportBatch:
- id
- fileName
- uploadedByUserId
- totalRows
- successRows
- failedRows
- duplicateRows
- createdAt

ImportError:
- id
- importBatchId
- rowNumber
- errorMessage
- rowData

ProfileCorrectionRequest:
- id
- memberProfileId
- requestedByUserId
- fieldName
- oldValue
- newValue
- status: PENDING, APPROVED, REJECTED
- reviewedByUserId
- createdAt
- updatedAt

Login flow:
- User opens app
- Enters mobile number
- Backend normalizes phone number
- Backend searches MemberProfile by phoneNumber
- If found:
  - Create User if not already created
  - Send/mock OTP
  - After OTP verification, return JWT token
  - Open Home screen
- If not found:
  - Show not registered screen
  - Show admin/contact committee number

Admin import screen:
- Upload Excel/CSV
- Map columns if needed
- Preview first 10 rows
- Confirm import
- Show import result summary
- Show failed rows with reason

Very important:
Do not expose all imported private details to every user automatically.
Even though data is already in Excel, app should still respect privacy.
Default visibility:
- Name: visible
- Profession: visible
- Area/city: visible
- Phone number: visible only to logged-in verified members
- Full address: hidden by default unless user/admin allows
- Family details: visible only in limited form or admin-only


FINAL FLOW 
Admin imports Excel sheet
        ↓
All members are stored in database
        ↓
Member opens app
        ↓
Member enters phone number
        ↓
System checks phone number in database
        ↓
If found → OTP login → user enters app
        ↓
If not found → show contact admin message
Design a high-quality mobile app UI for a local Indian community app called "Samaj Connect".

Context:
The app is for a community of 400–500 people living in Vadodara, originally from the same native place. The goal is to help members stay connected, find each other by profession, help each other in emergencies or daily needs, and manage community events like Snehmilan.

Design style:
- Warm, trustworthy, modern Indian community feeling
- Clean and simple, not too corporate
- Easy for all age groups to use
- Mobile-first design
- Large readable text
- Clear cards and simple navigation
- Use soft warm colors such as saffron, cream, deep green, maroon, and white
- Keep the design professional, not overly decorative
- Use rounded cards, subtle shadows, and friendly icons
- Design for Android first

Main navigation:
Bottom tab bar with:
1. Home
2. Directory
3. Events
4. Help
5. Profile

Create the following screens:

1. Splash screen
- App logo placeholder
- App name: Samaj Connect
- Tagline: "Stay connected. Help each other."

2. Login screen
- Phone number input
- Continue button
- Small text: "Only verified community members can access the app"

3. OTP verification screen
- OTP input
- Verify button
- Resend OTP text

4. Home dashboard
Show greeting:
"Namaste, [Name]"
Cards:
- Total community members
- Upcoming Snehmilan event
- Pending payment reminder
- Find help from community
- Search bar: "Search doctor, teacher, business..."

For admin version, show:
- Pending member approvals
- Total collection
- Pending payments
- Event registrations

5. Member directory screen
- Search bar at top
- Filter chips: Doctor, Teacher, Business, Student, Engineer, Blood Donor
- Member cards showing:
  - Profile avatar
  - Name
  - Profession
  - Area in Vadodara
  - Quick call/WhatsApp icons
- Example search result for "Doctor"

6. Member detail screen
Show:
- Profile photo/avatar
- Name
- Profession
- Area
- Phone number
- WhatsApp button
- Address section
- Family members section
- Skills/services section
- Can help with section
- Privacy note: "Some details are visible only to verified members"

7. Help screen
- Title: "How can the community help?"
- Category cards:
  - Medical Help
  - Education Help
  - Job/Business Help
  - Blood Donation
  - Emergency Contact
  - Legal/Other Help
- Each card should have icon and short description

8. Create help request screen
- Category dropdown
- Description text box
- Urgency selector: Normal, Important, Emergency
- Contact preference
- Submit request button

9. Events list screen
- Upcoming event card:
  - "Snehmilan 2026"
  - Date, time, venue
  - Registration status
  - Contribution: ₹1000 per family
  - Register button
- Past events section

10. Event detail screen
For Snehmilan:
- Event banner
- Date/time/venue
- Description
- Family contribution amount
- Registered families count
- Total attendees count
- Buttons:
  - Register Family
  - Add Kids Performance
  - View Payment Status

11. Event registration screen
- Family attendance form
- Number of adults
- Number of children
- Family members checklist
- Food preference note field
- Submit registration button

12. Kids performance registration screen
- Child name
- Performance type chips:
  Dance, Speech, Act, Singing, Other
- Title/topic
- Duration
- Notes
- Submit button

13. Payment status screen
For normal member:
- Event name
- Amount due: ₹1000
- Payment status: Pending/Paid
- Payment mode
- Payment date
- Contact committee button
- Note: "Payments are verified by committee members"

14. Admin payment collection screen
- Search family/member
- Filter tabs: All, Paid, Pending, Partial
- Payment cards:
  - Family name
  - Amount due
  - Amount paid
  - Status badge
  - Mark as Paid button
- Summary at top:
  - Expected collection
  - Collected
  - Pending

15. Admin event dashboard
- Event summary cards:
  - Registered families
  - Total attendees
  - Expected collection
  - Collected amount
  - Expenses
  - Balance
- Charts or simple progress bars
- Recent payments list
- Pending payments list

16. Expense management screen
- Expense summary
- Add expense button
- Expense list by category:
  Food, Venue, Decoration, Sound, Gifts, Misc
- Each expense card shows amount, paid to, date

17. Profile/settings screen
- My profile
- Family members
- Privacy controls:
  - Show phone number
  - Show address
- My events
- Logout button

Design components:
- Member card
- Event card
- Payment status badge
- Search bar
- Filter chips
- Dashboard stat cards
- Primary and secondary buttons
- Empty state screens
- Admin action buttons

Important UX:
- Searching for "doctor" should clearly show doctor members
- Admin screens should feel powerful but simple
- Normal members should not see complicated admin features
- Make payment status very clear
- Use Indian rupee symbol ₹
- Make the design suitable for middle-aged and elderly users too

Generate polished mobile UI screens with consistent spacing, typography, and design system. The result should be suitable for exporting to Figma and then handing off to a React Native developer.
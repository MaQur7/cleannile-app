# Event Management System - Feature Guide

## Overview

The Event Management System is now fully integrated into CleanNile. This feature enables admins to create and manage cleanup events, while allowing users to discover, join, and receive notifications about events happening in their areas.

## ✨ Features Added

### 1. **Admin Event Creation** (`/admin/events`)
**Location**: Accessible to admins via the navigation menu
**Features**:
- Create events with title, description, date/time, and location
- Set maximum volunteer capacity
- Target events by district
- Specify GPS coordinates for event location
- Automatic notifications sent to all users when event is created

**Form Fields**:
- **Event Title** - Name of the cleanup event
- **Description** - Detailed information about the event
- **Date & Time** - Event schedule (datetime-local input)
- **District** - Select from 10 Egyptian districts/regions
- **Max Volunteers** - Optional capacity limit
- **Location** - Optional GPS coordinates (latitude/longitude)

### 2. **User Event Discovery** (`/events`)
**For all authenticated users**
**Features**:
- Browse all upcoming cleanup events
- See event details including:
  - Event title and description
  - Date and time (formatted for easy reading)
  - Location/district
  - Current volunteer count
  - Maximum capacity (if set)
  - Spots remaining indicator
- Join events with one click
- See visual indicator if you've already joined
- Receive feedback when event is full

**Smart UI Elements**:
- ✓ "Joined" badge on events you've joined
- 🟠 Warning when only few spots remain (3 or less)
- 🔴 "Event Full" warning when capacity reached
- Success notification when you join

### 3. **Notifications System** (`/notifications`)
**For all authenticated users**
**Features**:
- Central hub for all announcements and notifications
- Real-time event announcements
- Relative timestamps (e.g., "5 minutes ago")
- Grouped by type (event_created, event_joined, etc.)
- Quick link to view events
- Persistent storage of all notifications
- Latest notifications appear first

**Notification Types**:
- 📢 Event created in your district
- ✓ Report status updates
- And more...

### 4. **Enhanced Events Section**
**Features**:
- Recent announcements banner at the top of `/events` page
- Shows latest 3 notifications
- Links directly to event join functionality
- Better date formatting
- Visual feedback for join actions
- Loading states and error handling

## 📊 Database Schema

### Events Collection
```
{
  id: string (auto-generated)
  title: string
  description: string
  date: string (ISO 8601 datetime)
  district: string
  volunteers: string[] (user IDs)
  createdBy: string (admin user ID)
  createdAt: timestamp
  maxVolunteers?: number
  location?: {
    latitude: number
    longitude: number
  }
}
```

### Notifications Collection
```
{
  id: string (auto-generated)
  type: string ("event_created", "event_joined", etc.)
  title: string
  description: string
  eventId?: string
  district?: string
  createdAt: timestamp
  read: boolean
}
```

## 🔐 Authorization

| Action | Role Required | Scope |
|--------|---------------|-------|
| Create Event | Admin | `/api/admin/events` (POST) |
| View Events | Any User | `/events` |
| Join Event | Any User | Vote/join on `/events` |
| View Notifications | Any User | `/notifications` |
| View Admin Panel | Admin | `/admin/events` |

## 🛠️ API Endpoints

### POST `/api/admin/events`
**Create a new event** (Admin only)

**Request**:
```json
{
  "title": "Nile River Cleanup",
  "description": "Join us for a major cleanup...",
  "date": "2026-03-15T09:00:00",
  "district": "Cairo - Central",
  "maxVolunteers": 50,
  "location": {
    "latitude": 30.0444,
    "longitude": 31.2357
  }
}
```

**Response**:
```json
{
  "id": "eventId123",
  "message": "Event created successfully",
  "title": "Nile River Cleanup",
  ...
}
```

### GET `/api/admin/events`
**List all events** (Admin only)

**Response**:
```json
[
  {
    "id": "eventId123",
    "title": "Nile River Cleanup",
    ...
  }
]
```

## 🎯 User Flows

### Admin Creating an Event
1. Navigate to "Manage Events" in admin panel
2. Fill in event details (title, date, location, etc.)
3. Click "Create Event & Send Notifications"
4. Event is created and notifications are sent to all users
5. Users see announcement in notifications section

### User Discovering & Joining an Event
1. Check "Notifications" for recent event announcements
2. Navigate to "Events" page
3. See list of upcoming events
4. Click "Join Event" button on desired event
5. See success message and "✓ Joined" badge
6. Event organizers can track volunteer count

## 🚀 Usage Examples

### Create an Event (Admin)
```
1. Go to /admin/events
2. Fill form:
   - Title: "Beach Cleanup Day"
   - Date: March 15, 2026 at 8:00 AM
   - District: "Cairo - East"
   - Max Volunteers: 100
   - Location: 30.0627° N, 31.2626° E
3. Click "Create Event & Send Notifications"
4. All users get a notification
```

### Join an Event (User)
```
1. Go to /events page
2. See "Beach Cleanup Day" event
3. Click "Join Event" button
4. See success: "✓ You've joined 'Beach Cleanup Day'!"
5. Button changes to "✓ Already Joined"
```

### Check Notifications (User)
```
1. Go to /notifications
2. See latest announcements
3. Click "View Events" to see the full event
4. Read full details and join if interested
```

## 🔧 Configuration

### Districts Available
- Cairo - Central
- Cairo - East
- Cairo - West
- Cairo - North
- Cairo - South
- Giza
- Qalyubia
- Menoufia
- Dakahlia
- Sharqia

To add more districts, edit `DISTRICTS` array in `/src/app/admin/events/page.tsx`

## 🐛 Error Handling

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Only admins can create events" | Non-admin tried to create event | Sign in with admin account |
| Event not appearing | Event date in past | Set future date/time |
| Can't join event | Event is full | Wait for spots or join another event |
| No notifications shown | Database empty | Admin creates first event |
| Join button disabled | Already joined or full | Check status badge |

## 📈 Future Enhancements

- Email notifications for event updates
- Event cancellation/rescheduling
- Volunteer feedback and ratings
- Event attendance tracking
- Recurring events template
- District-specific notifications
- SMS alerts for events
- Event map view with clustering
- Export attendance reports

## 🔗 Related Files

**Core Implementation**:
- `/src/app/api/admin/events/route.ts` - API endpoints
- `/src/app/admin/events/page.tsx` - Admin event creation UI
- `/src/app/events/page.tsx` - User event discovery
- `/src/app/notifications/page.tsx` - Notifications hub
- `/src/lib/schemas.ts` - Updated EventRecord type

**Navigation**:
- `/src/components/navigation/AppNavigation.tsx` - Updated menu

**Database**:
- Firestore `events` collection
- Firestore `notifications` collection

## ✅ Testing Checklist

- [ ] Admin can create event from admin panel
- [ ] Event appears in public events list
- [ ] Notifications appear in notifications hub
- [ ] Users can join events
- [ ] Event volunteer count increases
- [ ] "Joined" badge appears after joining
- [ ] Event full warning shows when capacity reached
- [ ] Date/time formats correctly in UI
- [ ] Error messages display for invalid data
- [ ] Mobile responsiveness works
- [ ] Offline handling (queue management)

## 📞 Support

For issues or questions:
1. Check the troubleshooting table above
2. Verify API response in browser console
3. Check Firestore database for data integrity
4. Review error logs in Firebase Console

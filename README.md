# 🚛 TransitOps — Smart Transport Operations Platform

> A centralized platform to digitize vehicle, driver, dispatch, maintenance, and expense management for logistics operations — built in an 8-hour hackathon.

---

## 📌 Table of Contents

- [Problem Statement](#-problem-statement)
- [Target Users](#-target-users)
- [Core Features](#-core-features)
- [Business Rules](#-business-rules)
- [Example Workflow](#-example-workflow)
- [Database Entities](#-database-entities)
- [Tech Stack](#-tech-stack)
- [AI-Powered Features](#-ai-powered-features)
- [Deliverables Checklist](#-deliverables-checklist)
- [Getting Started](#-getting-started)
- [Team](#-team)

---

## 🧩 Problem Statement

Many logistics companies still run transport operations on spreadsheets and paper logbooks. This causes:

- Scheduling conflicts and underutilized vehicles
- Missed maintenance windows
- Expired driver licenses going unnoticed
- Inaccurate expense tracking
- Poor operational visibility for decision-makers

**TransitOps** replaces this with a single system of record covering the full lifecycle: vehicle registration → dispatch → maintenance → fuel/expense logging → analytics.

---

## 👥 Target Users

| Role | Responsibility |
|---|---|
| **Fleet Manager** | Oversees fleet assets, maintenance, vehicle lifecycle, and operational efficiency |
| **Driver** | Creates trips, assigns vehicles and drivers, monitors active deliveries |
| **Safety Officer** | Ensures driver compliance, tracks license validity, monitors safety scores |
| **Financial Analyst** | Reviews operational expenses, fuel consumption, maintenance costs, and profitability |

Access is governed by **Role-Based Access Control (RBAC)** on top of secure email/password authentication.

---

## ⚙️ Core Features

### Authentication
- Secure email/password login
- RBAC across all four roles
- No unauthenticated access to any module

### Dashboard
- KPIs: Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization (%)
- Filters by vehicle type, status, and region

### Vehicle Registry
- Master list with unique Registration Number, Name/Model, Type, Max Load Capacity, Odometer, Acquisition Cost, Status
- Status values: `Available`, `On Trip`, `In Shop`, `Retired`

### Driver Management
- Profiles with Name, License Number, License Category, License Expiry Date, Contact Number, Safety Score, Status
- Status values: `Available`, `On Trip`, `Off Duty`, `Suspended`

### Trip Management
- Create trips by selecting source, destination, available vehicle, available driver, cargo weight, planned distance
- Lifecycle: `Draft → Dispatched → Completed → Cancelled`

### Maintenance
- Create maintenance records per vehicle
- Adding a vehicle to an active maintenance log auto-switches its status to `In Shop`, removing it from dispatch selection

### Fuel & Expense Management
- Log fuel entries (liters, cost, date) and other expenses (tolls, maintenance, etc.)
- Auto-computes total operational cost per vehicle (Fuel + Maintenance)

### Reports & Analytics
- Fuel Efficiency = Distance / Fuel
- Fleet Utilization
- Operational Cost
- Vehicle ROI = `(Revenue − (Maintenance + Fuel)) / Acquisition Cost`
- CSV export mandatory; PDF export optional

---

## 🔐 Business Rules

These are enforced at the application/service layer, not just the UI:

1. Vehicle registration number must be unique.
2. `Retired` or `In Shop` vehicles never appear in dispatch selection.
3. Drivers with expired licenses or `Suspended` status cannot be assigned to trips.
4. A driver or vehicle already `On Trip` cannot be assigned to another trip.
5. Cargo weight must not exceed the vehicle's maximum load capacity.
6. Dispatching a trip sets both vehicle and driver to `On Trip`.
7. Completing a trip sets both vehicle and driver back to `Available`.
8. Cancelling a dispatched trip restores vehicle and driver to `Available`.
9. Creating an active maintenance record sets vehicle to `In Shop`.
10. Closing maintenance restores the vehicle to `Available` (unless retired).

---

## 🔄 Example Workflow

```
1. Register vehicle 'Van-05'   → max capacity 500 kg, status = Available
2. Register driver 'Alex'      → valid license
3. Create trip                  → cargo weight = 450 kg
4. System validates 450 ≤ 500  → dispatch allowed
5. Dispatch                     → Vehicle & Driver → On Trip
6. Complete trip                → enter final odometer + fuel consumed
7. System                       → Vehicle & Driver → Available
8. Create maintenance record    → e.g. Oil Change → Vehicle → In Shop (hidden from dispatch)
9. Reports refresh               → operational cost & fuel efficiency updated
```

---

## 🗄 Database Entities

- **Users** — id, name, email, password_hash, role
- **Roles** — Fleet Manager, Driver, Safety Officer, Financial Analyst
- **Vehicles** — registration_number (unique), name/model, type, max_load_capacity, odometer, acquisition_cost, status
- **Drivers** — name, license_number, license_category, license_expiry_date, contact_number, safety_score, status
- **Trips** — source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, final_odometer, fuel_consumed
- **Maintenance Logs** — vehicle_id, type, cost, start_date, end_date, status
- **Fuel Logs** — vehicle_id, liters, cost, date
- **Expenses** — vehicle_id, category (toll/other), amount, date

---

## 🛠 Tech Stack

> _Fill in with what your team actually ships — suggested stack below for an 8-hour build._

| Layer | Suggestion |
|---|---|
| Frontend | React + Vite + TypeScript, TailwindCSS |
| Backend | FastAPI (Python) or Node.js/Express |
| Database | PostgreSQL |
| Auth | JWT-based auth with RBAC middleware |
| Charts | Recharts / Chart.js |
| Deployment | Vercel (frontend) + Render/Railway (backend) |

---

## 🤖 AI-Powered Features

Beyond the core CRUD platform, the following AI/ML-driven modules are proposed to differentiate TransitOps and address real operational pain points. Each is scoped so it could be prototyped with lightweight models within a hackathon, while still describing the production-grade version.

### 1. Predictive Vehicle Maintenance
- **How it works:** A regression/classification model (e.g., gradient boosting on tabular data, or simple survival analysis) predicts the probability of a component failure or the days-to-next-service based on usage patterns, rather than relying on fixed mileage intervals.
- **Required data:** Odometer readings over time, past maintenance logs (type, date, cost), vehicle age/model, average daily distance, fuel consumption trend.
- **Expected outputs:** A "maintenance risk score" per vehicle (Low/Medium/High) and a predicted next-service date, surfaced on the dashboard.
- **Business value:** Shifts maintenance from reactive/calendar-based to predictive, reducing breakdowns and unplanned downtime, and extending vehicle lifespan.
- **Odoo integration approach:** Consume data from Odoo's Fleet and Maintenance modules via the Odoo External API (XML-RPC/JSON-RPC), run the prediction as a scheduled server action or external microservice, and write the risk score back to a custom field on `fleet.vehicle`, triggering an Odoo activity/reminder when risk crosses a threshold.

### 2. Driver Risk Scoring
- **How it works:** A weighted scoring model (or logistic regression) combines historical safety incidents, harsh braking/speeding events (if telematics available), license compliance history, and trip completion patterns into a single risk score.
- **Required data:** Trip history, any telematics/GPS event logs, past safety incidents, license validity history, safety score field already in the schema.
- **Expected outputs:** A 0–100 driver risk score, updated after each trip, with a trend graph and flags for drivers approaching a "high risk" threshold.
- **Business value:** Helps Safety Officers proactively intervene (retraining, route reassignment) before incidents occur, and supports insurance/compliance reporting.
- **Odoo integration approach:** Extend `hr.employee` (or a custom `fleet.driver` model) with a computed risk field; sync incident/trip data from Odoo Fleet via ORM methods, and expose the score in an Odoo dashboard view or via a custom widget.

### 3. Fuel Consumption Anomaly Detection
- **How it works:** An unsupervised anomaly detection model (Isolation Forest or a simple z-score/statistical control-chart approach) flags fuel log entries that deviate significantly from a vehicle's historical consumption pattern for a similar route/distance.
- **Required data:** Fuel logs (liters, cost, date), trip distance, vehicle type/fuel efficiency baseline.
- **Expected outputs:** Flagged anomalous fuel entries (possible fuel theft, leakage, or data-entry error) with a severity indicator, shown in the Fuel & Expense module.
- **Business value:** Directly reduces fuel-related leakage/fraud, a major hidden cost in fleet operations.
- **Odoo integration approach:** Hook into Odoo's fuel log creation (via an `@api.model_create_multi` override or automated action) to score each new entry in real time and create an Odoo activity/notification for anomalies above threshold.

### 4. Route Optimization
- **How it works:** Uses a routing/optimization algorithm (e.g., OR-Tools VRP solver, or a simpler shortest-path + traffic-aware heuristic) to suggest optimal source-destination routes considering distance, expected traffic, and vehicle load.
- **Required data:** Source/destination coordinates, historical trip durations, road network data (e.g., from a mapping API), cargo weight and vehicle constraints.
- **Expected outputs:** A suggested route with estimated distance/time/fuel cost shown at trip creation time.
- **Business value:** Reduces fuel and time costs, improves on-time delivery rates.
- **Odoo integration approach:** Call an external routing microservice from a button/action on the Odoo Trip (`fleet.trip`) form view, then store the recommended route/ETA back on the trip record.

### 5. Cost Prediction
- **How it works:** A regression model trained on historical trips (distance, vehicle type, cargo weight, fuel prices) predicts the expected total cost of a new trip before it's dispatched.
- **Required data:** Historical trip cost breakdown (fuel + maintenance allocation), distance, vehicle type, cargo weight.
- **Expected outputs:** An estimated cost range shown at trip creation, compared later against actual cost for variance tracking.
- **Business value:** Enables better client quoting and budget planning for Financial Analysts.
- **Odoo integration approach:** Implement as a computed field on the trip creation wizard, calling a lightweight prediction service; log predicted vs. actual cost in an Odoo report for continuous model validation.

### 6. Delay Prediction
- **How it works:** A classification model estimates the probability a trip will be delayed based on route, weather, time of day, and driver/vehicle history.
- **Required data:** Historical trip planned vs. actual duration, route, time of departure, (optional) weather API data.
- **Expected outputs:** A delay-risk percentage shown at dispatch, with reasoning (e.g., "route congestion history").
- **Business value:** Allows proactive customer communication and buffer planning, improving service reliability.
- **Odoo integration approach:** Trigger prediction on trip dispatch via an Odoo automated action, storing the result on the trip and optionally notifying the customer through Odoo's email/SMS integration.

### 7. Intelligent Dispatch Recommendations
- **How it works:** A recommendation engine ranks available vehicle-driver pairs for a new trip based on proximity, load fit, driver risk score, vehicle maintenance risk, and cost prediction — essentially a multi-factor scoring/ranking model.
- **Required data:** Real-time vehicle/driver availability, location, safety scores, maintenance risk, cost predictions.
- **Expected outputs:** A ranked list of top 3 vehicle-driver combinations for a new trip, with the reasoning behind each recommendation.
- **Business value:** Speeds up dispatcher decision-making and optimizes for both cost and safety simultaneously — this is where several of the above models compose into one workflow (a lightweight multi-agent framing: a "maintenance agent," "risk agent," and "cost agent" each contribute a score that a "dispatch agent" aggregates).
- **Odoo integration approach:** Build as a custom wizard/action on trip creation in Odoo that calls the composite scoring service and pre-fills the top recommendation, while still letting the dispatcher override.

### 8. AI Chatbot for Fleet Managers
- **How it works:** An LLM-based conversational assistant (e.g., using the Anthropic API) answers natural-language questions about fleet status by translating them into structured queries against the database.
- **Required data:** Read access to vehicles, drivers, trips, and reports tables/models.
- **Expected outputs:** Conversational answers like "Which vehicles need maintenance this week?" or "Show me drivers with expiring licenses in 30 days."
- **Business value:** Removes the need to manually build filters/reports for every question, saving Fleet Managers time.
- **Odoo integration approach:** Implement as an Odoo custom module with a chat widget that sends the user's question plus a schema summary to the LLM, which returns a structured query (e.g., an Odoo domain filter) executed via the ORM, with the result summarized back in natural language.

### 9. Natural Language Reporting
- **How it works:** An LLM converts raw KPI/report data into a written narrative summary (e.g., "Fleet utilization rose 8% this month, driven by...").
- **Required data:** Aggregated KPIs from the Reports & Analytics module.
- **Expected outputs:** A short auto-generated paragraph accompanying each report/dashboard view.
- **Business value:** Makes reports accessible to non-technical stakeholders and speeds up executive reviews.
- **Odoo integration approach:** Add a "Generate Summary" button on Odoo report views that sends the underlying pivot/table data to the LLM and displays the narrative in a note field or PDF report header.

### 10. Automatic Expense Categorization
- **How it works:** A text classification model (or LLM-based few-shot classifier) automatically tags free-text expense descriptions into categories (Toll, Fuel, Maintenance, Fine, Misc.).
- **Required data:** Historical expense entries with descriptions and (if available) manually-assigned categories for training/fine-tuning.
- **Expected outputs:** Auto-filled category field when a new expense is logged, with a confidence score and manual override option.
- **Business value:** Reduces manual data entry errors and speeds up expense logging for drivers.
- **Odoo integration approach:** Override the `create`/`onchange` method on the Odoo expense model to call the classifier and pre-fill the category field before the record is saved.

### 11. Document OCR
- **How it works:** OCR (e.g., Tesseract, or a vision-capable LLM) extracts structured data from scanned/photographed documents such as driving licenses, insurance papers, and fuel receipts.
- **Required data:** Uploaded document images/PDFs (license copies, receipts, insurance certificates).
- **Expected outputs:** Auto-filled fields (license number, expiry date, receipt amount/date) reducing manual entry, plus a stored document reference.
- **Business value:** Speeds up driver onboarding and expense logging while improving data accuracy and enabling automatic expiry tracking.
- **Odoo integration approach:** Use Odoo's Documents app or an attachment field with a server action that runs OCR on upload and populates the corresponding record fields (e.g., `license_expiry_date` on the driver record).

### 12. Driver Performance Scoring
- **How it works:** A composite scoring model combines on-time delivery rate, fuel efficiency during trips, safety incidents, and customer feedback (if collected) into an overall performance score, distinct from the safety-only risk score.
- **Required data:** Trip completion times vs. planned, fuel efficiency per trip, incident history, optional customer ratings.
- **Expected outputs:** A performance score/leaderboard per driver, updated periodically, viewable by Fleet Managers.
- **Business value:** Supports fair performance reviews, incentive programs, and identifies training needs.
- **Odoo integration approach:** Compute as a scheduled Odoo cron job (`ir.cron`) that aggregates data across `fleet.trip`, `fleet.fuel.log`, and incident models, storing the result on the driver record and surfacing it in an Odoo dashboard/kanban view.

---

## ✅ Deliverables Checklist

**Mandatory**
- [ ] Responsive web interface
- [ ] Authentication with RBAC
- [ ] CRUD for Vehicles and Drivers
- [ ] Trip Management with validations
- [ ] Automatic status transitions
- [ ] Maintenance workflow
- [ ] Fuel & Expense tracking
- [ ] Dashboard with KPIs
- [ ] Charts and visual analytics
- [ ] CSV export

**Bonus**
- [ ] PDF export
- [ ] Email reminders for expiring licenses
- [ ] Vehicle document management
- [ ] Search, filters, and sorting
- [ ] Dark mode
- [ ] One or more AI-powered features from above

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/<your-org>/transitops.git
cd transitops

# Backend setup
cd backend
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload

# Frontend setup
cd ../frontend
npm install
npm run dev
```

> _Update the commands above once the actual project structure is finalized._

---

## 👥 Team

| Name |
|---|
| Tamizharasan |
| Nethra V     |
| SHANTHAN SAI M  |
| AZIM FATHIMA A|

---

## 📄 License

This project was built for hackathon purposes. 

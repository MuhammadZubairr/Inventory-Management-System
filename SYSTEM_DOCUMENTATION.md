# Inventory Management System - System Documentation

## 1. Project Overview
The **Professional Inventory Management System** is a robust, end-to-end web application designed to help businesses track stock levels, manage product lifecycles, and monitor warehouse operations. The system is built with a modern design and a scalable back-end architecture to handle complex inventory movements across multiple locations.

---

## 2. Purpose of the System
The primary purpose of this system is to provide a centralized platform for managing inventory data. It solves common business challenges such as:
- **Overstocking and Understocking**: Using low-stock alerts and minimum inventory thresholds.
- **Traceability**: Logging every stock movement (In, Out, or Adjustment) with detailed transaction history.
- **Vendor Management**: Maintaining a clear database of suppliers and their performance.
- **Efficiency**: Reducing manual tracking errors through an automated digital interface.

---

## 3. How the System Works (Workflow)
The system follows a logical workflow to ensure data integrity and ease of use:

1.  **System Initialization**: The Super Admin uses the default credentials to set up the system.
2.  **User Creation**: The **Admin** creates accounts for other users (Managers, Staff, Viewers) and assigns them to specific warehouses based on their duties.
3.  **Identity Verification**: All users log in with their assigned credentials to access the system. The application uses **Role-Based Access Control (RBAC)** to ensure users only see information relevant to their job.
4.  **Product & Warehouse Setup**: Products are registered with unique **SKUs** and assigned to specific **Categories** and **Warehouses**.
5.  **Real-time Stock Tracking**: When products arrive (Stock In) or are shipped out (Stock Out), the system automatically updates the database in real-time.
6.  **Monitoring & Alerts**: The **Dashboard** provides a high-level summary of total products, total value, and critical alerts (e.g., "Low Stock" or "Out of Stock").
7.  **Reporting**: Managers and Admins can view historical transactions and filter data by date, type, or warehouse to make informed decisions.

---

## 4. System Architecture Overview
The application utilizes a classic **Client-Server Architecture**:

-   **Frontend (User Interface)**: Built with modern **HTML5**, **CSS3** (custom professional design system), and **Vanilla JavaScript**. It communicates with the backend using the **Fetch API**.
-   **Backend (API Layer)**: Powered by **Node.js** and **Express.js**. It handles business logic, security middleware, and data validation.
-   **Database (Storage Layer)**: Uses **MongoDB** (with **Mongoose ODM**) to store relational-style data in a flexible document format.
-   **Deployment**: Optimized for standard cloud hosting platforms with integrated **Vercel** configurations.

---

## 5. User Roles and Permissions
All non-admin users must be created and added to the system by an account holder with the **Admin** role.

| Role | Responsibility | Access Level |
| :-- | :-- | :-- |
| **Admin** | Full system oversight, warehouse creation, and **Staff Account Management**. | Total Access |
| **Manager** | Oversees specific warehouses and reports. | Management Access |
| **Staff** | Handles daily operations like stock-in/out and product updates. | Operational Access |
| **Viewer** | Observes data and reads reports without making changes. | Read-Only Access |

---

## 6. Authentication and Credential Structure
The system uses email/password for security. While the Admin account is initialized during setup, all and other user accounts are **added manually by the Administrator** through the user management interface.

### **1. Administrator Access (System Default)**
-   **Email**: `admin@gmail.com`
-   **Password**: `admin123`
-   **Role**: `admin`

### **2. Other Users Added by Admin (Database Records)**
The following users are pre-configured or commonly used as "other users" in the system database for testing and operational purposes:

| Name | Role | Email (Login) | Password |
| :--- | :--- | :--- | :--- |
| **John Doe** | Staff | `john.doe@university.edu` | `password123` |
| **Test User** | Staff | `test@university.edu` | `password123` |
| **Alternative Admin** | Admin | `admin@university.edu` | `admin123` |

### **System User Structure Details**
-   **Email**: Unique identification for login.
-   **Password**: Always securely hashed using bcrypt in the database (e.g., `password123` or `admin123`).
-   **Warehouse Assignment**: Required for non-admin users to restrict data access specifically to their physical location.
-   **Account Status**: Admins can set status to `active`, `inactive`, or `suspended`.

---

## 7. Main Features
-   **Interactive Dashboard**: Real-time analytics, stock levels, and quick metrics.
-   **Product Management**: Advanced catalog with SKU tracking, categories, and pricing.
-   **Multi-Warehouse Support**: Monitor inventory levels independently across different physical locations.
-   **Transaction History**: Comprehensive logs for all inventory adjustments including returns and damaged goods.
-   **Supplier Management**: Track vendor contact information, payment terms, and status.
-   **Responsive UI**: Professionally styled interface that works smoothly on desktops and tablets.

---

## 8. Database Tables Overview
The database (MongoDB) consists of five primary collections (tables):

| Collection | Description | Key Data Stored |
| :-- | :-- | :-- |
| **Users** | Account and permission data. | Name, Email, Role, Assigned Warehouse. |
| **Products** | Detailed inventory item records. | SKU, Category, Price, Global/Warehouse Quantities. |
| **Suppliers** | Vendor and partner information. | Company Name, Code, Contact Details, Status. |
| **Transactions** | Audit trail of all stock movements. | Transaction ID, Type (In/Out), Quantity, Performed By. |
| **Warehouses** | Physical storage location details. | Code, Name, Full Address, Capacity. |

---

## 9. Conclusion
The **Inventory Management System** is a scalable solution that bridges the gap between complex enterprise inventory needs and user-friendly digital tools. By combining a modern web interface with a secure backend API, it provides a powerful platform for businesses to optimize their supply chain and ensure stock availability at all times.

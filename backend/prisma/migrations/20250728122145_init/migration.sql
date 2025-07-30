-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "surveyArea" TEXT,
    "coordinateSystem" TEXT NOT NULL DEFAULT 'JGD2000',
    "units" TEXT NOT NULL DEFAULT 'm',
    "boundingBox" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    CONSTRAINT "ProjectUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectUser_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Layer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "lineType" TEXT NOT NULL DEFAULT 'CONTINUOUS',
    "lineWidth" REAL NOT NULL DEFAULT 1.0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Layer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sxfData" TEXT,
    "metadata" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Drawing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Drawing_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DrawingElement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "geometry" TEXT NOT NULL,
    "properties" TEXT,
    "style" TEXT,
    "layerId" TEXT,
    "drawingId" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DrawingElement_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "Layer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DrawingElement_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DrawingElement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurveyPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pointNumber" TEXT NOT NULL,
    "pointType" TEXT NOT NULL,
    "coordinates" TEXT NOT NULL,
    "elevation" REAL,
    "accuracy" TEXT,
    "measureMethod" TEXT,
    "measureDate" DATETIME,
    "surveyorName" TEXT,
    "remarks" TEXT,
    "projectId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SurveyPoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SurveyPoint_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoundaryLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineNumber" TEXT,
    "lineType" TEXT NOT NULL,
    "geometry" TEXT NOT NULL,
    "length" REAL,
    "azimuth" REAL,
    "measureMethod" TEXT,
    "certainty" TEXT NOT NULL DEFAULT '確定',
    "fromPointId" TEXT,
    "toPointId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BoundaryLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BoundaryLine_fromPointId_fkey" FOREIGN KEY ("fromPointId") REFERENCES "SurveyPoint" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BoundaryLine_toPointId_fkey" FOREIGN KEY ("toPointId") REFERENCES "SurveyPoint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LandParcel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelNumber" TEXT NOT NULL,
    "address" TEXT,
    "area" REAL,
    "landUse" TEXT,
    "owner" TEXT,
    "geometry" TEXT,
    "registrationDate" DATETIME,
    "remarks" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LandParcel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EditSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "socketId" TEXT NOT NULL,
    "cursor" TEXT,
    "selection" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChangeHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "oldData" TEXT,
    "newData" TEXT,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectUser_userId_projectId_key" ON "ProjectUser"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Layer_projectId_name_key" ON "Layer"("projectId", "name");

-- CreateIndex
CREATE INDEX "DrawingElement_type_idx" ON "DrawingElement"("type");

-- CreateIndex
CREATE INDEX "DrawingElement_layerId_idx" ON "DrawingElement"("layerId");

-- CreateIndex
CREATE INDEX "DrawingElement_drawingId_idx" ON "DrawingElement"("drawingId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyPoint_projectId_pointNumber_key" ON "SurveyPoint"("projectId", "pointNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LandParcel_projectId_parcelNumber_key" ON "LandParcel"("projectId", "parcelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EditSession_socketId_key" ON "EditSession"("socketId");

-- CreateIndex
CREATE INDEX "EditSession_userId_idx" ON "EditSession"("userId");

-- CreateIndex
CREATE INDEX "EditSession_projectId_idx" ON "EditSession"("projectId");

-- CreateIndex
CREATE INDEX "ChangeHistory_projectId_timestamp_idx" ON "ChangeHistory"("projectId", "timestamp");

-- CreateIndex
CREATE INDEX "ChangeHistory_objectType_objectId_idx" ON "ChangeHistory"("objectType", "objectId");

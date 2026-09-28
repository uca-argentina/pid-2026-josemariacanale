INSERT INTO "User" ("name", "email", "clerkId", "createdAt") VALUES 
('Juan Perez', 'juan@example.com', 'test_clerk_1', NOW()),
('Maria Gomez', 'maria@example.com', 'test_clerk_2', NOW()),
('Carlos Lopez', 'carlos@example.com', 'test_clerk_3', NOW())
ON CONFLICT ("clerkId") DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update only their own profile; public profiles readable by all
CREATE POLICY "Users can read their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Properties: Owners can insert/update/delete their own; all authenticated users can read
CREATE POLICY "Owners can insert properties" ON properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own properties" ON properties
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own properties" ON properties
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "All authenticated users can read properties" ON properties
  FOR SELECT USING (auth.role() = 'authenticated');

-- Bookings: Tenants can read their own; owners can read bookings for their properties; system can insert
CREATE POLICY "Tenants can read their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Owners can read bookings for their properties" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = bookings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "System can insert bookings" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tenants can update their own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can delete their own bookings" ON bookings
  FOR DELETE USING (auth.uid() = tenant_id);

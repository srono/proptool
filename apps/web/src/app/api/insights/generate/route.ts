import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAreaInsight } from '@/lib/insights/generate';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listing_id } = await request.json();
    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
    }

    // Fetch listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Generate insights
    const insights = await generateAreaInsight({
      address: listing.address,
      postal_code: listing.postal_code,
      district: listing.district,
      property_type: listing.property_type,
      asking_price: listing.asking_price,
      asking_rental: listing.asking_rental,
      floor_area_sqft: listing.floor_area_sqft,
      tenure: listing.tenure,
      listing_type: listing.listing_type,
      hdb_type: listing.hdb_type,
    });

    // Save to listing
    const { error: updateError } = await supabase
      .from('listings')
      .update({ area_insights: insights })
      .eq('id', listing_id);

    if (updateError) {
      console.error('[Insights API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save insights' }, { status: 500 });
    }

    return NextResponse.json({ insights }, { status: 200 });
  } catch (error) {
    console.error('[Insights API] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

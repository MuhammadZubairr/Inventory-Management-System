/**
 * Test script to verify SKU update functionality
 * Run this after making changes to verify the fix
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testSKUUpdate() {
  console.log('🧪 Testing SKU Update Functionality\n');
  
  try {
    // Step 1: Get all products
    console.log('1. Fetching products...');
    const productsResponse = await axios.get(`${API_BASE}/products?limit=5`);
    const products = productsResponse.data.data?.products || [];
    
    if (products.length === 0) {
      console.log('❌ No products found. Please create a product first.');
      return;
    }
    
    console.log(`✅ Found ${products.length} products`);
    const testProduct = products[0];
    console.log(`   Testing with product: ${testProduct.name} (SKU: ${testProduct.sku})\n`);
    
    // Step 2: Try updating with a new unique SKU
    console.log('2. Testing unique SKU update...');
    const newSku = `TEST-${Date.now()}`;
    try {
      const updateResponse = await axios.put(
        `${API_BASE}/products/${testProduct._id}`,
        { sku: newSku, name: testProduct.name }
      );
      console.log(`✅ SKU updated successfully to: ${newSku}`);
      console.log(`   Response:`, updateResponse.data);
    } catch (error) {
      console.log(`❌ Failed to update SKU:`, error.response?.data || error.message);
    }
    
    // Step 3: Try updating with a duplicate SKU (if we have another product)
    if (products.length > 1) {
      console.log('\n3. Testing duplicate SKU rejection...');
      try {
        await axios.put(
          `${API_BASE}/products/${testProduct._id}`,
          { sku: products[1].sku, name: testProduct.name }
        );
        console.log('❌ Duplicate SKU was accepted (should have been rejected!)');
      } catch (error) {
        if (error.response?.status === 409) {
          console.log('✅ Duplicate SKU correctly rejected');
          console.log(`   Error message: ${error.response.data.message}`);
        } else {
          console.log(`❌ Unexpected error:`, error.response?.data || error.message);
        }
      }
    }
    
    // Step 4: Restore original SKU
    console.log('\n4. Restoring original SKU...');
    try {
      await axios.put(
        `${API_BASE}/products/${testProduct._id}`,
        { sku: testProduct.sku, name: testProduct.name }
      );
      console.log(`✅ SKU restored to: ${testProduct.sku}`);
    } catch (error) {
      console.log(`❌ Failed to restore SKU:`, error.response?.data || error.message);
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testSKUUpdate();
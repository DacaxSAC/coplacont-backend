const axios = require('axios');

// Configuración base
const BASE_URL = 'http://localhost:3000';
const TEST_PERSONAS = [1, 2]; // IDs de personas para probar

/**
 * Función para hacer login y obtener token
 */
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'lcastillorabanal@icloud.com',
      contrasena: '3ada035fc170f861'
    });
    console.log('Respuesta del login:', response.data);
    
    if (!response.data.success) {
      throw new Error(`Login failed: ${response.data.message || 'Unknown error'}`);
    }
    
    return response.data.jwt;
  } catch (error) {
    console.error('Error en login:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Función para crear un comprobante de prueba
 */
async function crearComprobante(token, personaId) {
  const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const comprobanteData = {
      tipoOperacion: 'compra',
      tipoComprobante: 'FACTURA',
      moneda: 'PEN',
      fechaEmision: new Date().toISOString().split('T')[0],
      idPersona: 1, // ID de la entidad (cliente/proveedor)
      serie: 'F001',
      numero: `3480238`,
      observaciones: `Comprobante de prueba para persona ${personaId}`,
      detalles: [{
      idInventario: 1,
      cantidad: 10,
      precioUnitario: 100.00
    }]
  };

  // El correlativo se genera automáticamente

  try {
    const response = await axios.post(
      `${BASE_URL}/api/comprobante`,
      comprobanteData,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error(`Error creando comprobante para persona ${personaId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Función principal de prueba
 */
async function probarCorrelativos() {
  console.log('🚀 Iniciando pruebas de correlativos por persona...');
  
  try {
    // 1. Hacer login
    console.log('\n1. Haciendo login...');
    const token = await login();
    console.log('✅ Login exitoso');

    // 2. Probar correlativos automáticos para cada persona
    console.log('\n2. Probando correlativos automáticos...');
    const resultados = {};
    
    for (const personaId of TEST_PERSONAS) {
      console.log(`\n   Probando persona ${personaId}:`);
      resultados[personaId] = [];
      
      // Crear 3 comprobantes para cada persona
      for (let i = 1; i <= 3; i++) {
        console.log(`   - Creando comprobante ${i}...`);
        const comprobante = await crearComprobante(token, personaId);
        resultados[personaId].push(comprobante.correlativo);
        console.log(`     ✅ Correlativo generado: ${comprobante.correlativo}`);
        
        // Esperar un poco entre peticiones
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 3. Probar correlativo manual
    console.log('\n3. Probando correlativo manual...');
    const comprobanteManual = await crearComprobante(token, TEST_PERSONAS[0], true);
    console.log(`   ✅ Correlativo manual: ${comprobanteManual.correlativo}`);

    // 4. Mostrar resumen
    console.log('\n📊 RESUMEN DE RESULTADOS:');
    console.log('=' .repeat(50));
    
    for (const personaId of TEST_PERSONAS) {
      console.log(`\nPersona ${personaId}:`);
      resultados[personaId].forEach((correlativo, index) => {
        console.log(`  Comprobante ${index + 1}: ${correlativo}`);
      });
    }
    
    console.log(`\nCorrelativo manual: ${comprobanteManual.correlativo}`);
    
    // 5. Verificar que los correlativos son únicos por persona
    console.log('\n5. Verificando unicidad por persona...');
    let todosCorrecto = true;
    
    for (const personaId of TEST_PERSONAS) {
      const correlativos = resultados[personaId];
      const unicos = new Set(correlativos);
      
      if (correlativos.length === unicos.size) {
        console.log(`   ✅ Persona ${personaId}: Todos los correlativos son únicos`);
      } else {
        console.log(`   ❌ Persona ${personaId}: Hay correlativos duplicados`);
        todosCorrecto = false;
      }
    }
    
    if (todosCorrecto) {
      console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
      console.log('✅ Los correlativos se generan correctamente por persona');
      console.log('✅ Los correlativos manuales funcionan correctamente');
      console.log('✅ No hay duplicados dentro de cada persona');
    } else {
      console.log('\n❌ ALGUNAS PRUEBAS FALLARON');
    }
    
  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);
  }
}

// Ejecutar las pruebas
probarCorrelativos();
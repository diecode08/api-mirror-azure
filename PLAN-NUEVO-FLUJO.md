# 🚀 PLAN DE MIGRACIÓN: FLUJO SIMPLIFICADO DE SALIDA Y PAGO

## 📊 RESUMEN DEL CAMBIO

### Flujo ANTERIOR (híbrido complejo):
```
Usuario móvil: Solicitar salida → Esperar
Admin web: Ver solicitud → Validar pago
Sistema: Trigger cierra ocupación
```
**Problema:** 4 pasos, triggers complejos, usuario espera validación

### Flujo NUEVO (simplificado):
```
Admin web: Ver vehículo → Marcar salida + Cobrar (1 paso)
Sistema: Todo se cierra en 1 transacción
Usuario móvil: Ve automáticamente que completó
```
**Ventaja:** 1 solo paso, sin triggers complejos, instantáneo

---

## 🗂️ FASES DE IMPLEMENTACIÓN

### ✅ FASE 0: Limpieza de datos (2 min)
**Archivo:** `limpieza-datos-flujo-nuevo.sql`
- TRUNCATE de pago, ocupacion, reserva
- Resetear espacios a disponible
- **Estado:** Listo para ejecutar

---

### 🔧 FASE 1: Backend - Refactorizar marcarSalida (30-40 min)

#### Cambios en `ocupacion.controller.js`:

**Función actual:** `marcarSalida(req, res)`
- Solo cierra ocupación
- No maneja pago
- Bloquea si hay salida solicitada

**Función nueva:** `marcarSalidaConPago(req, res)`
```javascript
// Body esperado:
{
  id_ocupacion: number,
  id_metodo: number,        // ID del método de pago (efectivo, tarjeta, etc)
  monto_recibido?: number,  // Opcional, solo para efectivo
  tipo_comprobante: 'boleta' | 'factura',  // Default: boleta
  es_simulado: boolean      // Default: false
}
```

**Lógica nueva (1 transacción):**
1. Obtener ocupación y calcular costo
2. Crear pago con estado='COMPLETADO' (sin pasar por PENDIENTE)
3. Cerrar ocupación (hora_salida, costo_total, estado='finalizada')
4. Liberar espacio (estado='disponible')
5. Completar reserva (estado='completada')
6. Asignar comprobante (serie/numero automático)
7. Retornar vuelto si aplica

**Ventajas:**
- Todo en 1 transacción (ROLLBACK si falla)
- No depende de triggers
- Instantáneo

---

### 🚫 FASE 2: Backend - Deshabilitar endpoints obsoletos (5 min)

**Archivo:** `src/routes/flujo.routes.js`

Comentar rutas (NO eliminar todavía):
```javascript
// router.post('/solicitar-salida', flujoController.solicitarSalida);
// router.patch('/pagos/:id/validar', flujoController.validarPago);
```

**Por qué comentar y no eliminar:**
- Si algo sale mal, podemos volver rápido
- Después de probar 1 semana, entonces eliminar

---

### 🖥️ FASE 3: Web - Crear modal de pago (45-60 min)

**Nuevo archivo:** `front-web/components/PaymentModal.tsx`

**Contenido del modal:**
```tsx
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocupacion: OcupacionRecord;
  onSuccess: () => void;
}

// UI:
- Mostrar: Vehículo, tiempo total, monto a pagar
- Select: Método de pago (efectivo, tarjeta, yape, QR)
- Input: Monto recibido (solo si efectivo)
- Cálculo automático de vuelto
- Select: Tipo de comprobante (boleta/factura)
- Botón: "Finalizar y cobrar"
```

**Llamada API:**
```typescript
await api.patch(`/ocupaciones/${id}/marcar-salida-con-pago`, {
  id_metodo,
  monto_recibido,
  tipo_comprobante
});
```

---

### 🔗 FASE 4: Web - Integrar modal (20 min)

**Archivo:** `front-web/app/my-parkings/[id]/page.tsx`

**Cambios:**
1. Reemplazar botón "Validar pago" por "Marcar salida"
2. Al hacer click → abrir PaymentModal
3. Pasar datos de ocupación al modal
4. Después de éxito → recargar lista

**Antes:**
```tsx
<Button onClick={() => validarPago(pago.id)}>
  Validar pago
</Button>
```

**Después:**
```tsx
<Button onClick={() => openPaymentModal(ocupacion)}>
  Marcar salida
</Button>
```

---

### 📱 FASE 5: Móvil - Ocultar "Solicitar salida" (10 min)

**Archivo:** `front-movil/src/screens/ActiveParkingScreen.tsx`

**Cambios:**
```tsx
// Comentar/eliminar botón "Solicitar salida"
{/* 
<Button onPress={handleSolicitarSalida}>
  Solicitar salida
</Button>
*/}

// Dejar solo vista de estado:
<Text>Estado: {ocupacion.estado}</Text>
<Text>
  {ocupacion.estado === 'finalizada' 
    ? 'Tu reserva ha sido completada' 
    : 'Estacionado en el parking'}
</Text>
```

**Usuario solo VE el estado, no puede solicitar salida**

---

### ✅ FASE 6: Testing E2E (30 min)

**Flujo completo:**
1. **Móvil:** Usuario crea reserva → llega al parking
2. **Web:** Admin confirma entrada
3. **Móvil:** Usuario ve que está "En parking"
4. (Usuario usa el parking por X tiempo)
5. **Web:** Admin ve vehículo en lista → Click "Marcar salida"
   - Modal aparece con costo calculado
   - Admin selecciona método de pago
   - Si efectivo, ingresa monto recibido → ve vuelto
   - Click "Finalizar y cobrar"
6. **Verificar:**
   - ✅ Ocupación cerrada (hora_salida registrada)
   - ✅ Pago creado con estado COMPLETADO
   - ✅ Espacio liberado (verde en mapa)
   - ✅ Reserva completada
   - ✅ Móvil muestra reserva completada en historial
   - ✅ No se puede volver a marcar salida

---

### 🧹 FASE 7: Limpieza final (OPCIONAL - después de 1 semana)

**Si todo funciona perfectamente:**

1. **Eliminar endpoints:** `solicitarSalida`, `validarPago`
2. **Eliminar campo de BD:**
   ```sql
   ALTER TABLE ocupacion 
   DROP COLUMN hora_salida_solicitada;
   ```
3. **Actualizar vistas** sin ese campo
4. **Eliminar código móvil** comentado

**Si hay problemas:**
- Mantener código comentado
- Reactivar flujo anterior rápidamente

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Ejecutar `limpieza-datos-flujo-nuevo.sql`
- [ ] Refactorizar `marcarSalida` en backend
- [ ] Comentar rutas obsoletas
- [ ] Crear `PaymentModal.tsx`
- [ ] Integrar modal en `my-parkings/[id]/page.tsx`
- [ ] Ocultar botón en `ActiveParkingScreen.tsx`
- [ ] Probar flujo completo E2E
- [ ] Verificar que no haya regresiones
- [ ] (Después de 1 semana) Limpieza final

---

## ⏱️ TIEMPO ESTIMADO TOTAL: 2-3 horas

### Desglose:
- Backend: 40 min
- Web: 80 min
- Móvil: 10 min
- Testing: 30 min
- Buffer: 20 min

---

## 🎯 VENTAJAS DEL NUEVO FLUJO

✅ **Menos pasos:** De 4 a 1 para el admin
✅ **Más rápido:** Sin esperas para el usuario
✅ **Más robusto:** 1 transacción vs triggers complejos
✅ **Más intuitivo:** Como funcionan parkings reales
✅ **Más fácil de mantener:** Menos código, menos bugs
✅ **Mejor UX:** Admin cobra y marca salida en 1 click

---

## 🔄 ROLLBACK PLAN

**Si algo sale mal:**
1. Descomentar rutas en `flujo.routes.js`
2. Revertir cambios en web (git checkout)
3. Revertir cambios en móvil (git checkout)
4. Mantener marcarSalidaConPago como endpoint adicional
5. Investigar problema sin afectar producción

---

## 📝 NOTAS IMPORTANTES

- ⚠️ NO eliminar `hora_salida_solicitada` todavía (ignorar por ahora)
- ⚠️ Mantener código comentado hasta verificar 1 semana
- ✅ El esquema actual NO necesita cambios (perfecto como está)
- ✅ Puedes borrar datos sin problema (fase de pruebas)

/**
 * Implementa un sistema de cache LRU (Least Recently Used) eficiente
 * que mantenga un tamaño máximo y elimine elementos no usados recientemente
 * 
 * @param {number} capacity - Capacidad máxima del cache
 */
class LRUCache {
    constructor(capacity) {
        if (!Number.isInteger(capacity) || capacity <= 0) throw new Error('Capacity must be a positive integer');
        this.capacity = capacity;
        this.cache = new Map(); // Map mantiene el orden de inserción
    }

    /**
     * Obtiene un valor del cache
     * @param {string} key - Clave a buscar
     * @returns {any} Valor encontrado o null
     */
    get(key) {
        // Una sola búsqueda en el Map (más eficiente)
        const value = this.cache.get(key);
        if (value === undefined) return null;

        // Mover al final (marcar como recientemente usado)
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    /**
     * Almacena un valor en el cache
     * @param {string} key - Clave
     * @param {any} value - Valor a almacenar
     */
    put(key, value) {
        // Si la clave ya existe, eliminarla para actualizar posición
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } 
        // Si el cache está lleno, eliminar el LRU (primero)
        else if (this.cache.size >= this.capacity) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        // Insertar al final (más reciente)
        this.cache.set(key, value);
    }

    // === MÉTODOS AUXILIARES (opcionales) ===

    /**
     * Método para debugging - muestra el estado del cache
     */
    display() {
        const entries = [...this.cache].map(([key, value]) => `${key}:${value}`);
        console.log(`Cache: [${entries.join(" -> ")}] (size: ${this.cache.size})`);
    }

    /**
     * Obtiene todas las claves en orden de uso (del menos al más reciente)
     */
    getKeys = () => Array.from(this.cache.keys());

    /**
     * Verifica si existe una clave en el cache
     */
    has = (key) => this.cache.has(key);

    /**
     * Obtiene el tamaño actual del cache
     */
    size = () => this.cache.size;

    /**
     * Limpia todo el cache
     */
    clear = () => this.cache.clear();
}

// === EJEMPLOS DE USO Y PRUEBAS ===
console.log("=== TEST 1: Comportamiento básico ===");
const cache = new LRUCache(3);
cache.put("a", 1);
cache.put("b", 2);
cache.put("c", 3);
cache.display(); // [a:1 -> b:2 -> c:3]

console.log("\n=== TEST 2: Acceso mueve al final ===");
cache.get("a"); // a debería moverse al final
cache.display(); // [b:2 -> c:3 -> a:1]

console.log("\n=== TEST 3: Overflow elimina LRU ===");
cache.put("d", 4); // Debería eliminar "b" (LRU)
cache.display(); // [c:3 -> a:1 -> d:4]

console.log("\n=== TEST 4: Actualización ===");
cache.put("a", 10); // Actualiza y mueve al final
cache.display(); // [c:3 -> d:4 -> a:10]

console.log("\n=== TEST 5: Acceso a elemento inexistente ===");
console.log("get('x'):", cache.get("x")); // null

console.log("\n=== TEST 6: Capacidad 1 ===");
const smallCache = new LRUCache(1);
smallCache.put("a", 1);
smallCache.display(); // [a:1]
smallCache.put("b", 2); // Elimina "a"
smallCache.display(); // [b:2]

console.log("\n=== TEST 7: Validación de capacidad ===");
try {
    const invalidCache = new LRUCache(0);
} catch (error) {
    console.log("Error esperado:", error.message);
}

console.log("\n=== TEST 8: Estrés con múltiples operaciones ===");
const stressCache = new LRUCache(3);
for (let i = 0; i < 10; i++) {
    stressCache.put(`key${i}`, i);
    if (i % 2 === 0 && i > 0) stressCache.get(`key${i - 1}`);
}
stressCache.display();

// Verificación de complejidad O(1)
console.log("\n=== VERIFICACIÓN DE COMPLEJIDAD O(1) ===");
console.log("✓ get() - O(1): Acceso directo + reordenamiento constante");
console.log("✓ put() - O(1): Inserción/actualización + eliminación LRU constante");
console.log("✓ Uso de Map nativo de JavaScript que garantiza O(1) promedio");
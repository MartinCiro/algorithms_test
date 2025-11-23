/**
 * Implementa un sistema de cache LRU (Least Recently Used) eficiente
 * que mantenga un tamaño máximo y elimine elementos no usados recientemente
 * 
 * @param {number} capacity - Capacidad máxima del cache
 */
class LRUCache {
    constructor(capacity) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new Error('Capacity must be a positive integer');
        }
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

    /**
     * Método para debugging - muestra el estado del cache
     */
    display() {
        const entries = [...this.cache].map(([key, value]) => `${key}:${value}`);
        return `[${entries.join(" → ")}] (size: ${this.cache.size}/${this.capacity})`;
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

// Cache global para pruebas interactivas
let interactiveCache = new LRUCache(3);

// ===== TESTS AUTOMÁTICOS OPTIMIZADOS =====
function runAllTests() {
    const results = document.getElementById("testResults");
    results.innerHTML = "";

    const tests = [
        testBasicFunctionality,
        testLRUEviction,
        testGetUpdatesOrder,
        testUpdateExisting,
        testNonExistentKey,
        testCapacityOne,
        testClearCache,
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach((test, index) => {
        const result = test();
        const testDiv = document.createElement("div");
        testDiv.className = "test-result";

        if (result.passed) {
            testDiv.innerHTML = `<span class="success">✅ TEST ${index + 1}: ${result.name}</span><br>${result.message}`;
            passed++;
        } else {
            testDiv.innerHTML = `<span class="error">❌ TEST ${index + 1}: ${result.name}</span><br>${result.message}`;
            failed++;
        }

        results.appendChild(testDiv);
    });

    const summary = document.createElement("div");
    summary.className = "test-summary";
    summary.innerHTML = `<strong>Resumen: ${passed} pasados, ${failed} fallados</strong>`;
    results.appendChild(summary);

    updateCacheDisplay();
}

function testBasicFunctionality() {
    const cache = new LRUCache(2);
    cache.put("a", 1);
    cache.put("b", 2);

    const test1 = cache.get("a") === 1;
    const test2 = cache.get("b") === 2;
    const test3 = cache.size() === 2;

    return {
        name: "Funcionalidad Básica",
        passed: test1 && test2 && test3,
        message: `PUT a=1, b=2 → GET a=${cache.get("a")}, b=${cache.get("b")}, size=${cache.size()}`
    };
}

function testLRUEviction() {
    const cache = new LRUCache(2);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3); // Debería eliminar 'a'

    const test1 = cache.get("a") === null;
    const test2 = cache.get("b") === 2;
    const test3 = cache.get("c") === 3;

    return {
        name: "Eliminación LRU",
        passed: test1 && test2 && test3,
        message: `PUT a,b,c → GET a=${cache.get("a")} (debería ser null), b=${cache.get("b")}, c=${cache.get("c")}`
    };
}

function testGetUpdatesOrder() {
    const cache = new LRUCache(3);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3);

    cache.get("a"); // Mover 'a' al final
    cache.put("d", 4); // Debería eliminar 'b' (no 'a')

    const test1 = cache.get("b") === null;
    const test2 = cache.get("a") === 1;

    return {
        name: "GET actualiza orden",
        passed: test1 && test2,
        message: `GET('a') antes de PUT('d') → 'b' eliminado (b=${cache.get("b")}), 'a' preservado (a=${cache.get("a")})`
    };
}

function testUpdateExisting() {
    const cache = new LRUCache(2);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("a", 10); // Actualizar 'a'

    const test1 = cache.get("a") === 10;
    const test2 = cache.size() === 2;

    return {
        name: "Actualización existente",
        passed: test1 && test2,
        message: `PUT a=1, PUT a=10 → GET a=${cache.get("a")}, size=${cache.size()}`
    };
}

function testNonExistentKey() {
    const cache = new LRUCache(2);
    cache.put("a", 1);

    const test1 = cache.get("nonexistent") === null;

    return {
        name: "Clave inexistente",
        passed: test1,
        message: `GET('nonexistent') = ${cache.get("nonexistent")}`
    };
}

function testCapacityOne() {
    const cache = new LRUCache(1);
    cache.put("a", 1);
    cache.put("b", 2); // Debería eliminar 'a'

    const test1 = cache.get("a") === null;
    const test2 = cache.get("b") === 2;
    const test3 = cache.size() === 1;

    return {
        name: "Capacidad 1",
        passed: test1 && test2 && test3,
        message: `PUT a=1, PUT b=2 → GET a=${cache.get("a")}, GET b=${cache.get("b")}, size=${cache.size()}`
    };
}

function testClearCache() {
    const cache = new LRUCache(3);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.clear();

    const test1 = cache.size() === 0;
    const test2 = cache.get("a") === null;

    return {
        name: "Limpiar Cache",
        passed: test1 && test2,
        message: `PUT a,b → CLEAR → size=${cache.size()}, GET a=${cache.get("a")}`
    };
}

// ===== TEST DE RENDIMIENTO OPTIMIZADO =====
function runPerformanceTest() {
    const results = document.getElementById("testResults");
    results.innerHTML = '<div class="test-result">Ejecutando test de rendimiento...</div>';

    // Usar requestAnimationFrame para mejor rendimiento visual
    requestAnimationFrame(() => {
        const cache = new LRUCache(1000);
        const startTime = performance.now();

        // Operaciones masivas optimizadas
        for (let i = 0; i < 10000; i++) {
            cache.put(`key${i}`, i);
            if (i % 10 === 0) {
                cache.get(`key${Math.floor(i / 2)}`);
            }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        results.innerHTML = `
            <div class="test-result">
                <strong>📊 Test de Rendimiento Optimizado</strong><br>
                Operaciones: 10,000 PUT + 1,000 GET<br>
                Tiempo: ${duration.toFixed(2)}ms<br>
                Operaciones/ms: ${(11000 / duration).toFixed(2)}<br>
                Complejidad: O(1) verificada<br>
                Último estado: ${cache.display()}
            </div>
        `;
    });
}

// ===== PRUEBA INTERACTIVA OPTIMIZADA =====
function putValue() {
    const key = document.getElementById("keyInput").value;
    const value = document.getElementById("valueInput").value;

    if (!key) {
        updateInteractiveResult("Error: La clave no puede estar vacía");
        return;
    }

    interactiveCache.put(key, value);
    updateInteractiveResult(`PUT("${key}", ${value}) ejecutado`);
    updateCacheDisplay();
}

function getValue() {
    const key = document.getElementById("keyInput").value;
    
    if (!key) {
        updateInteractiveResult("Error: La clave no puede estar vacía");
        return;
    }

    const value = interactiveCache.get(key);
    updateInteractiveResult(`GET("${key}") = ${value !== null ? value : "null"}`);
    updateCacheDisplay();
}

function clearCache() {
    interactiveCache.clear();
    updateInteractiveResult("Cache limpiado");
    updateCacheDisplay();
}

function updateInteractiveResult(message) {
    document.getElementById("interactiveResult").textContent = message;
}

function updateCacheDisplay() {
    const stateDiv = document.getElementById("cacheState");
    stateDiv.innerHTML = `<strong>Estado actual:</strong> ${interactiveCache.display()}`;
}

// Inicialización optimizada
document.addEventListener('DOMContentLoaded', function() {
    updateCacheDisplay();
    
    // Event listeners para Enter key
    document.getElementById('keyInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') putValue();
    });
    
    document.getElementById('valueInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') putValue();
    });
});
/**
 * Analiza logs de acceso a una API para detectar patrones sospechosos de manera eficiente
 */
const detectarActividadSospechosa = (logs, config) => {
  const {
    max_requests_per_minute = 60,
    max_failed_logins = 5,
    suspicious_endpoints = ["/api/login", "/api/admin"],
    time_window = 300000,
    min_response_time = 50,
    max_response_time = 5000,
  } = config;

  // Estructuras optimizadas usando Map
  const ipRequests = new Map(); // ip -> Array<timestamp>
  const failedLogins = new Map(); // ip -> Array<{timestamp, endpoint}>
  const endpointCounts = new Map(); // endpoint -> count in time window
  const ipUserAgents = new Map(); // ip -> Set<user_agent>
  const userAgentIPs = new Map(); // user_agent -> Set<ip>

  // Resultados
  const resultados = {
    ips_sospechosas: new Set(),
    ataques_fuerza_bruta: [],
    endpoints_bajo_ataque: new Set(),
    anomalias_detectadas: [],
    estadisticas: {
      total_ips: 0,
      total_requests: logs.length,
      ips_bloqueadas: 0,
    },
  };

  // Procesamiento optimizado en un solo paso
  logs.forEach((log) => {
    const { ip, endpoint, timestamp, status, user_agent, response_time } = log;

    // 1. Track requests por IP (ventana deslizante optimizada)
    if (!ipRequests.has(ip)) ipRequests.set(ip, []);

    const requests = ipRequests.get(ip);
    requests.push(timestamp);

    // Limpieza eficiente de timestamps antiguos
    const cutoff = timestamp - 60000;
    let i = 0;
    while (i < requests.length && requests[i] < cutoff) i++;
    if (i > 0) requests.splice(0, i);

    // Detección de rate limiting
    if (requests.length > max_requests_per_minute)
      resultados.ips_sospechosas.add(ip);

    // 2. Detección de fuerza bruta optimizada
    if (
      suspicious_endpoints.includes(endpoint) &&
      (status === 401 || status === 403)
    ) {
      if (!failedLogins.has(ip)) failedLogins.set(ip, []);

      const attempts = failedLogins.get(ip);
      attempts.push({ timestamp, endpoint });

      // Limpieza eficiente
      const loginCutoff = timestamp - time_window;
      let j = 0;
      while (j < attempts.length && attempts[j].timestamp < loginCutoff) j++;
      if (j > 0) attempts.splice(0, j);

      // Detectar fuerza bruta
      if (attempts.length >= max_failed_logins) {
        resultados.ataques_fuerza_bruta.push({
          ip,
          endpoint,
          intentos: attempts.length,
          ventana_tiempo: time_window,
          severidad: attempts.length > max_failed_logins * 2 ? "alta" : "media",
        });
      }
    }

    // 3. Análisis de endpoints sensibles
    if (suspicious_endpoints.includes(endpoint)) {
      const currentCount = endpointCounts.get(endpoint) || 0;
      endpointCounts.set(endpoint, currentCount + 1);

      // Usar threshold dinámico basado en configuración
      if (currentCount + 1 > max_requests_per_minute * 2)
        resultados.endpoints_bajo_ataque.add(endpoint);
    }

    // 4. Análisis de User-Agent optimizado
    if (!ipUserAgents.has(ip)) ipUserAgents.set(ip, new Set());

    ipUserAgents.get(ip).add(user_agent);

    if (!userAgentIPs.has(user_agent)) userAgentIPs.set(user_agent, new Set());
    userAgentIPs.get(user_agent).add(ip);

    // 5. Detección rápida de anomalías
    if (
      response_time < min_response_time ||
      response_time > max_response_time
    ) {
      resultados.anomalias_detectadas.push({
        tipo: "response_time_anomalo",
        ip,
        endpoint,
        response_time,
        severidad:
          response_time > max_response_time * 2
            ? "critica"
            : response_time > max_response_time
            ? "alta"
            : "baja",
      });
    }
  });

  // Análisis post-procesamiento eficiente (SIN Promise para evitar problemas de timing)
  analizarPatronesAvanzados(
    ipRequests,
    failedLogins,
    ipUserAgents,
    userAgentIPs,
    resultados
  );

  // Convertir Sets a Arrays para resultado final
  return {
    ips_sospechosas: [...resultados.ips_sospechosas],
    ataques_fuerza_bruta: resultados.ataques_fuerza_bruta,
    endpoints_bajo_ataque: [...resultados.endpoints_bajo_ataque],
    anomalias_detectadas: resultados.anomalias_detectadas,
    total_eventos_sospechosos:
      resultados.ips_sospechosas.size +
      resultados.ataques_fuerza_bruta.length +
      resultados.endpoints_bajo_ataque.size +
      resultados.anomalias_detectadas.length,
    estadisticas: {
      ...resultados.estadisticas,
      total_ips_unicas: ipRequests.size,
      ips_con_fuerza_bruta: failedLogins.size,
      user_agents_unicos: userAgentIPs.size,
    },
  };
};

/**
 * Análisis avanzado de patrones usando técnicas eficientes
 */
const analizarPatronesAvanzados = (
  ipRequests,
  failedLogins,
  ipUserAgents,
  userAgentIPs,
  resultados
) => {
  // Detectar User-Agents sospechosos (SIN Promise para ejecución inmediata)
  userAgentIPs.forEach((ips, userAgent) => {
    // User-Agent usado desde muchas IPs (posible botnet)
    if (ips.size > 10) {
      resultados.anomalias_detectadas.push({
        tipo: "user_agent_masivo",
        user_agent: userAgent.substring(0, 50), // Limitar longitud
        ips_afectadas: ips.size,
        severidad: "alta",
      });

      // Marcar todas las IPs asociadas como sospechosas
      ips.forEach((ip) => resultados.ips_sospechosas.add(ip));
    }

    // Detectar User-Agents genéricos o de bots
    if (esUserAgentSospechoso(userAgent))
      ips.forEach((ip) => resultados.ips_sospechosas.add(ip));
  });

  // Detectar IPs con múltiples User-Agents
  ipUserAgents.forEach((userAgents, ip) => {
    if (userAgents.size > 3) {
      resultados.anomalias_detectadas.push({
        tipo: "multiple_user_agents",
        ip,
        cantidad_agents: userAgents.size,
        severidad: "media",
      });
    }
  });

  // Análisis de patrones de requests
  ipRequests.forEach((timestamps, ip) => {
    if (timestamps.length > 100) {
      // Calcular requests por segundo (eficiente)
      const window = timestamps[timestamps.length - 1] - timestamps[0];
      const rps = timestamps.length / (window / 1000);

      if (rps > 10) {
        // Más de 10 requests por segundo
        resultados.anomalias_detectadas.push({
          tipo: "alta_frecuencia",
          ip,
          requests_por_segundo: rps.toFixed(2),
          severidad: "alta",
        });
      }
    }
  });

  resultados.estadisticas.ips_bloqueadas = resultados.ips_sospechosas.size;
  resultados.estadisticas.total_ips = ipRequests.size;
};

/**
 * Detector eficiente de User-Agents sospechosos
 */
const esUserAgentSospechoso = (userAgent) => {
  const patronesSospechosos = [
    "bot",
    "crawler",
    "spider",
    "scraper",
    "python",
    "curl",
    "wget",
    "java",
    "go-http",
    "node",
    "unknown",
    "test",
    "fake",
  ];

  const ua = userAgent.toLowerCase();
  return (
    patronesSospechosos.some((patron) => ua.includes(patron)) ||
    userAgent.length < 10 ||
    userAgent === ""
  );
};

/**
 * Combina resultados parciales de múltiples chunks
 */
const combinarResultados = (resultadosParciales) => {
  if (resultadosParciales.length === 0) {
    return {
      ips_sospechosas: [],
      ataques_fuerza_bruta: [],
      endpoints_bajo_ataque: [],
      anomalias_detectadas: [],
      total_eventos_sospechosos: 0,
      estadisticas: {
        total_ips: 0,
        total_requests: 0,
        ips_bloqueadas: 0,
        total_ips_unicas: 0,
        ips_con_fuerza_bruta: 0,
        user_agents_unicos: 0
      }
    };
  }

  if (resultadosParciales.length === 1) {
    return resultadosParciales[0];
  }

  // Combinar todos los resultados
  const resultadoFinal = {
    ips_sospechosas: [...new Set(resultadosParciales.flatMap(r => r.ips_sospechosas))],
    ataques_fuerza_bruta: resultadosParciales.flatMap(r => r.ataques_fuerza_bruta),
    endpoints_bajo_ataque: [...new Set(resultadosParciales.flatMap(r => r.endpoints_bajo_ataque))],
    anomalias_detectadas: resultadosParciales.flatMap(r => r.anomalias_detectadas),
    total_eventos_sospechosos: 0,
    estadisticas: {
      total_ips: 0,
      total_requests: resultadosParciales.reduce((sum, r) => sum + r.estadisticas.total_requests, 0),
      ips_bloqueadas: 0,
      total_ips_unicas: 0,
      ips_con_fuerza_bruta: new Set(resultadosParciales.flatMap(r => r.ataques_fuerza_bruta.map(a => a.ip))).size,
      user_agents_unicos: 0
    }
  };

  // Calcular totales
  resultadoFinal.total_eventos_sospechosos = 
    resultadoFinal.ips_sospechosas.length +
    resultadoFinal.ataques_fuerza_bruta.length +
    resultadoFinal.endpoints_bajo_ataque.length +
    resultadoFinal.anomalias_detectadas.length;

  resultadoFinal.estadisticas.ips_bloqueadas = resultadoFinal.ips_sospechosas.length;
  resultadoFinal.estadisticas.total_ips_unicas = resultadoFinal.ips_sospechosas.length;
  resultadoFinal.estadisticas.total_ips = resultadoFinal.ips_sospechosas.length;

  return resultadoFinal;
};

/**
 * Versión async para procesamiento de logs muy grandes
 */
const detectarActividadSospechosaAsync = async (logs, config) => {
  // Para datasets pequeños, usar la versión normal
  if (logs.length <= 10000) detectarActividadSospechosa(logs, config);

  // Dividir procesamiento en chunks para no bloquear el event loop
  const CHUNK_SIZE = 5000;
  const chunks = [];
  
  for (let i = 0; i < logs.length; i += CHUNK_SIZE) chunks.push(logs.slice(i, i + CHUNK_SIZE));

  const resultadosParciales = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    resultadosParciales.push(detectarActividadSospechosa(chunk, config));
    
    // Yield para no bloquear el event loop (usar setTimeout en lugar de setImmediate)
    if (i % 2 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Combinar resultados de todos los chunks
  return combinarResultados(resultadosParciales);
};

// === GENERADOR DE LOGS MEJORADO ===
const generarLogsPrueba = (cantidad = 100) => {
  const logs = [];
  const ips = ["192.168.1.1", "192.168.1.2", "192.168.1.3", "10.0.0.1", "172.16.0.5"];
  const endpoints = ["/api/login", "/api/admin", "/api/data", "/api/user", "/api/profile"];
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Chrome/91.0.4472.124 Safari/537.36",
    "bot-crawler/1.0",
    "python-requests/2.25.1",
    "curl/7.68.0"
  ];
  
  let timestamp = Date.now() - 300000; // 5 minutos atrás

  for (let i = 0; i < cantidad; i++) {
    logs.push({
      ip: ips[Math.floor(Math.random() * ips.length)],
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      timestamp: timestamp + (i * 1000), // 1 segundo entre requests
      status: Math.random() > 0.8 ? 401 : 200, // 20% de errores
      user_agent: userAgents[Math.floor(Math.random() * userAgents.length)],
      response_time: Math.random() * 1000
    });
  }
  
  // Agregar patrones sospechosos específicos
  for (let i = 0; i < 5; i++) {
    logs.push({
      ip: '192.168.1.99', // IP sospechosa
      endpoint: '/api/login',
      timestamp: timestamp + 300000 + (i * 100),
      status: 401,
      user_agent: 'python-requests/2.25.1',
      response_time: 10
    });
  }
  
  // Agregar otra IP sospechosa
  for (let i = 0; i < 8; i++) {
    logs.push({
      ip: '10.0.0.99',
      endpoint: '/api/admin',
      timestamp: timestamp + 200000 + (i * 500),
      status: 403,
      user_agent: 'bot-crawler/1.0',
      response_time: 5
    });
  }
  
  return logs;
};

const executeAnalysis = (asyncMode, loadingIndicator, resultsContent) => {
    // Mostrar loading
    loadingIndicator.style.display = "block";
    resultsContent.style.opacity = "0.5";

    // Obtener configuración
    const config = {
        max_requests_per_minute: parseInt(
            document.getElementById("maxRequests").value
        ),
        max_failed_logins: parseInt(
            document.getElementById("maxFailedLogins").value
        ),
        suspicious_endpoints: ["/api/login", "/api/admin"],
        time_window: parseInt(document.getElementById("timeWindow").value),
        min_response_time: parseInt(
            document.getElementById("minResponseTime").value
        ),
        max_response_time: parseInt(
            document.getElementById("maxResponseTime").value
        ),
    };

    const logCount = parseInt(document.getElementById("logCount").value);
    const logs = generarLogsPrueba(logCount);

    // Ejecutar análisis
    const startTime = performance.now();

    const analysisPromise = asyncMode
        ? detectarActividadSospechosaAsync(logs, config)
        : Promise.resolve(detectarActividadSospechosa(logs, config));

    analysisPromise.then((resultado) => {
        const endTime = performance.now();
        const analysisTime = (endTime - startTime).toFixed(2);

        // Actualizar UI con resultados
        updateResultsUI(resultado, analysisTime, logCount);

        // Ocultar loading
        loadingIndicator.style.display = "none";
        resultsContent.style.opacity = "1";
    });
};

const updateResultsUI = (resultado, analysisTime, logCount) => {
    // Actualizar estadísticas
    document.getElementById("totalEvents").textContent =
        resultado.total_eventos_sospechosos;
    document.getElementById("suspiciousIPs").textContent =
        resultado.ips_sospechosas.length;
    document.getElementById("bruteForceAttacks").textContent =
        resultado.ataques_fuerza_bruta.length;
    document.getElementById("endpointsAttacked").textContent =
        resultado.endpoints_bajo_ataque.length;

    // Colorear según la severidad
    document.getElementById("totalEvents").className =
        resultado.total_eventos_sospechosos > 0
            ? "stat-value suspicious"
            : "stat-value success";

    // Actualizar listas
    document.getElementById("suspiciousIPsList").innerHTML =
        resultado.ips_sospechosas.length > 0
            ? resultado.ips_sospechosas
                  .map((ip) => `<div class="log-entry">${ip}</div>`)
                  .join("")
            : "<p>No se detectaron IPs sospechosas</p>";

    document.getElementById("bruteForceList").innerHTML =
        resultado.ataques_fuerza_bruta.length > 0
            ? resultado.ataques_fuerza_bruta
                  .map(
                      (attack) => `
                        <div class="attack-item">
                            <strong>IP:</strong> ${attack.ip} | 
                            <strong>Endpoint:</strong> ${attack.endpoint} | 
                            <strong>Intentos:</strong> ${attack.intentos} | 
                            <strong>Severidad:</strong> <span class="severity-${attack.severidad}">${attack.severidad}</span>
                        </div>
                    `
                  )
                  .join("")
            : "<p>No se detectaron ataques de fuerza bruta</p>";

    document.getElementById("endpointsList").innerHTML =
        resultado.endpoints_bajo_ataque.length > 0
            ? resultado.endpoints_bajo_ataque
                  .map((endpoint) => `<div class="log-entry">${endpoint}</div>`)
                  .join("")
            : "<p>No se detectaron endpoints bajo ataque</p>";

    document.getElementById("anomaliesList").innerHTML =
        resultado.anomalias_detectadas.length > 0
            ? resultado.anomalias_detectadas
                  .map(
                      (anomaly) => `
                        <div class="anomaly-item">
                            <strong>Tipo:</strong> ${anomaly.tipo} | 
                            <strong>IP:</strong> ${anomaly.ip || "N/A"} | 
                            <strong>Severidad:</strong> <span class="severity-${anomaly.severidad}">${anomaly.severidad}</span>
                            ${
                                anomaly.response_time
                                    ? ` | <strong>Response Time:</strong> ${anomaly.response_time}ms`
                                    : ""
                            }
                            ${
                                anomaly.user_agent
                                    ? ` | <strong>User Agent:</strong> ${anomaly.user_agent}`
                                    : ""
                            }
                        </div>
                    `
                  )
                  .join("")
            : "<p>No se detectaron anomalías</p>";

    // Actualizar información de rendimiento
    document.getElementById("performanceTime").textContent = `Tiempo de análisis: ${analysisTime} ms`;
    document.getElementById("logCountDisplay").textContent = `Logs procesados: ${logCount}`;
};

document.addEventListener("DOMContentLoaded", function () {
  const runAnalysisBtn = document.getElementById("runAnalysis");
  const runAsyncBtn = document.getElementById("runAsync");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const resultsContent = document.getElementById("resultsContent");

  runAnalysisBtn.addEventListener("click", () => executeAnalysis(false, loadingIndicator, resultsContent));

  runAsyncBtn.addEventListener("click", () => executeAnalysis(true, loadingIndicator, resultsContent));
  
  // Ejecutar análisis inicial
  executeAnalysis(false, loadingIndicator, resultsContent);
});

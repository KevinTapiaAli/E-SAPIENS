// Original teaching examples for the isolated academic demonstration.
export const courses = [
  {
    title: "Contabilidad Básica I",
    slug: "contabilidad-basica-i",
    teacher: 0,
    description:
      "Aprende a registrar operaciones de un pequeño negocio y comprobar el equilibrio de sus cuentas.",
    topics: [
      [
        "Ecuación contable",
        "El activo representa recursos; el pasivo, obligaciones; el patrimonio, aportes y resultados. La relación activo = pasivo + patrimonio debe mantenerse en cada operación.",
        "Un aporte de Bs 12.000 y un préstamo de Bs 3.000 producen Bs 15.000 de activo, Bs 3.000 de pasivo y Bs 12.000 de patrimonio. Comprar una computadora al contado transforma efectivo en equipo, sin cambiar el activo total.",
        "¿Cuál es el activo después del aporte y préstamo?",
        ["Bs 15.000", "Bs 12.000", "Bs 9.000"],
      ],
      [
        "Libro diario",
        "El diario registra operaciones cronológicamente. Cada asiento identifica cuentas, importes y una explicación. Los débitos y créditos deben sumar lo mismo; su efecto depende del tipo de cuenta.",
        "Comprar materiales al contado por Bs 800 se registra: debe Materiales Bs 800; haber Caja Bs 800. Se reconoce el recurso y la salida de dinero. Conserva fecha y comprobante para revisar el asiento.",
        "¿Cómo se registra la compra de materiales al contado?",
        [
          "Debe Materiales; haber Caja",
          "Debe Caja; haber Materiales",
          "Debe Materiales; haber Ventas",
        ],
      ],
      [
        "Libro mayor",
        "El mayor agrupa por cuenta los movimientos del diario. Permite conocer aumentos, disminuciones y saldos. Una cuenta de activo suele presentar saldo deudor cuando sus débitos superan sus créditos.",
        "Caja recibe un aporte de Bs 5.000, cobra Bs 1.200 y paga materiales por Bs 700. Su saldo es Bs 5.500. Un pago adicional de alquiler por Bs 900 reduce ese saldo a Bs 4.600.",
        "¿Qué saldo queda tras pagar el alquiler?",
        ["Bs 4.600", "Bs 5.500", "Bs 6.400"],
      ],
      [
        "Balance de comprobación",
        "El balance de comprobación compara saldos deudores y acreedores del mayor. Su igualdad detecta algunas diferencias aritméticas, pero no prueba que todas las operaciones estén completas o bien clasificadas.",
        "Caja Bs 5.500, Equipos Bs 4.000 y Materiales Bs 500 suman Bs 10.000 de saldos deudores. Préstamos Bs 3.000 y Capital Bs 7.000 suman Bs 10.000 de saldos acreedores. Omitir completamente una operación podría conservar esa igualdad.",
        "¿Qué demuestra la igualdad de columnas?",
        [
          "Los saldos deudores y acreedores suman lo mismo",
          "Todas las operaciones son correctas",
          "El negocio siempre tiene ganancias",
        ],
      ],
    ],
  },
  {
    title: "Contabilidad de Costos",
    slug: "contabilidad-de-costos",
    teacher: 1,
    description:
      "Identifica costos de producción, organiza hojas de costos y compara órdenes de trabajo.",
    topics: [
      [
        "Costos fijos y variables",
        "Dentro de un rango de actividad, el costo fijo permanece constante en total. El variable cambia con el volumen. El costo fijo unitario disminuye al aumentar la producción.",
        "Un taller paga Bs 2.000 de alquiler y utiliza Bs 15 de materiales por producto. Para 150 unidades, el costo total considerado es 2.000 + 150 × 15 = Bs 4.250. No se incluyen otros costos en este ejemplo.",
        "¿Cuál es el costo total de 150 unidades?",
        ["Bs 4.250", "Bs 3.500", "Bs 5.000"],
      ],
      [
        "Costos directos e indirectos",
        "Un costo directo se identifica con un producto u orden. El indirecto beneficia varias actividades y exige una base de distribución documentada. La clasificación depende del objeto que se desea medir.",
        "Una orden consume Bs 1.200 de madera y Bs 800 de mano de obra. Se le asignan Bs 450 de costos comunes según horas utilizadas. Su costo total es Bs 2.450. Otra base de reparto podría producir un importe diferente.",
        "¿Cuánto cuesta esta orden?",
        ["Bs 2.450", "Bs 2.000", "Bs 1.650"],
      ],
      [
        "Costeo por órdenes",
        "La hoja de costos reúne materiales directos, mano de obra y costos indirectos asignados a un pedido. Identifica documentos y unidades para comparar trabajos y calcular el costo por unidad.",
        "Una orden de 60 carpetas consume Bs 750 de materiales, Bs 500 de mano de obra y Bs 250 indirectos. Su costo total es Bs 1.500; dividido entre 60 produce Bs 25 por carpeta. El precio de venta se decide por separado.",
        "¿Cuál es el costo unitario?",
        ["Bs 25", "Bs 30", "Bs 60"],
      ],
    ],
  },
  {
    title: "Elaboración de Estados Financieros",
    slug: "elaboracion-de-estados-financieros",
    teacher: 0,
    description:
      "Prepara estados financieros conectados a partir de registros sencillos de una organización ficticia.",
    topics: [
      [
        "Balance general",
        "Presenta activos, pasivos y patrimonio en una fecha. Resume recursos, obligaciones y participación de los propietarios. Los importes proceden de registros revisados y conservan la ecuación contable.",
        "Caja Bs 8.000, Inventarios Bs 6.000 y Equipos Bs 10.000 suman activos de Bs 24.000. Proveedores Bs 5.000 y Préstamos Bs 7.000 suman pasivos de Bs 12.000. El patrimonio resulta Bs 12.000.",
        "¿Cuál es el patrimonio?",
        ["Bs 12.000", "Bs 24.000", "Bs 36.000"],
      ],
      [
        "Estado de resultados",
        "Compara ingresos y gastos de un período. Separa ventas, costo de ventas y gastos operativos. El resultado contable no equivale necesariamente al efectivo cobrado durante ese período.",
        "Ventas de Bs 20.000 menos costo de ventas de Bs 12.000 generan Bs 8.000 de ganancia bruta. Restar gastos de Bs 6.500 deja Bs 1.500 antes de otros conceptos no incluidos. Identifica siempre el período al presentar el estado.",
        "¿Cuál es el resultado del ejemplo?",
        ["Bs 1.500", "Bs 8.000", "Bs 6.500"],
      ],
      [
        "Estado de evolución del patrimonio",
        "Conecta el saldo inicial con el saldo final mediante aportes, resultados y retiros. Una inversión del propietario modifica el patrimonio, pero no constituye un ingreso por ventas.",
        "Patrimonio inicial Bs 12.000, aportes Bs 3.000, ganancia Bs 2.500 y retiros Bs 1.000 producen patrimonio final de Bs 16.500. Una tabla separa cada causa del cambio y permite conciliar el saldo con el balance general.",
        "¿Cuál es el patrimonio final?",
        ["Bs 16.500", "Bs 17.500", "Bs 13.500"],
      ],
      [
        "Estado de flujos de efectivo",
        "Explica cambios del efectivo agrupando operación, inversión y financiamiento. Una venta a crédito puede generar un ingreso sin una entrada inmediata de efectivo.",
        "Efectivo inicial Bs 2.000; cobros Bs 10.000 menos pagos operativos Bs 7.000 generan Bs 3.000 netos. La compra de equipos usa Bs 4.000 y un préstamo aporta Bs 5.000. El efectivo final es Bs 6.000.",
        "¿Cómo se clasifica recibir un préstamo?",
        ["Financiamiento", "Inversión", "Venta de mercaderías"],
      ],
    ],
  },
  {
    title: "Análisis e Interpretación Financiera",
    slug: "analisis-e-interpretacion-financiera",
    teacher: 1,
    description:
      "Interpreta indicadores de liquidez, rentabilidad y deuda y compara estados entre períodos.",
    topics: [
      [
        "Liquidez",
        "La razón corriente divide activo corriente entre pasivo corriente. Ayuda a evaluar compromisos próximos, junto con la calidad de los activos y las fechas de cobro y pago.",
        "Con Bs 18.000 de activo corriente y Bs 12.000 de pasivo corriente, la razón es 1,5. Hay Bs 1,50 de activo corriente por cada boliviano de obligación corriente. No todo inventario puede convertirse inmediatamente en efectivo.",
        "¿Cuál es la razón corriente?",
        ["1,5", "2,0", "0,67"],
      ],
      [
        "Rentabilidad",
        "El margen neto divide el resultado neto entre las ventas del mismo período y lo expresa como porcentaje. Debe aclararse qué resultado se utiliza y compararse con períodos equivalentes.",
        "Resultado neto de Bs 4.000 sobre ventas de Bs 50.000 produce un margen de 8 %. Cada Bs 100 vendidos generan Bs 8 de resultado. Investiga cambios en costos y gastos antes de atribuir la diferencia a una sola causa.",
        "¿Cuál es el margen neto?",
        ["8 %", "10 %", "12,5 %"],
      ],
      [
        "Endeudamiento",
        "El endeudamiento divide pasivo total entre activo total. Expresa la proporción de recursos asociada a obligaciones. También deben revisarse vencimientos, intereses y capacidad de generar efectivo.",
        "Pasivos de Bs 24.000 frente a activos de Bs 80.000 representan 30 %. El patrimonio es Bs 56.000. Un porcentaje aislado no indica si los próximos pagos podrán cumplirse; se necesita el calendario de deuda y flujos previstos.",
        "¿Cuál es el endeudamiento?",
        ["30 %", "40 %", "70 %"],
      ],
      [
        "Análisis vertical y horizontal",
        "El análisis vertical expresa partidas como porcentaje de una base del mismo estado. El horizontal calcula cambios absolutos y relativos entre períodos. Indica siempre cuál es el período base.",
        "Ventas que pasan de Bs 50.000 a Bs 55.000 crecen Bs 5.000, equivalentes a 10 % sobre el año anterior. Si el costo actual es Bs 33.000, representa 60 % de las ventas actuales mediante análisis vertical.",
        "¿Cuál es la variación horizontal de las ventas?",
        ["10 %", "25 %", "5 %"],
      ],
    ],
  },
  {
    title: "Auditoría Contable I",
    slug: "auditoria-contable-i",
    teacher: 2,
    description:
      "Relaciona controles internos, evidencia y riesgos a través de casos contables ficticios.",
    topics: [
      [
        "Control interno",
        "Los controles protegen recursos y mejoran la información. Separar autorización, registro y custodia reduce oportunidades de error. Cada control necesita responsable, evidencia de ejecución y revisión.",
        "Caja registra Bs 2.500 de cobros, pero el conteo arroja Bs 2.450. Una persona cobra, otra registra y una tercera concilia comprobantes y efectivo. La diferencia de Bs 50 se investiga y documenta conservando los registros originales.",
        "¿Qué acción separa adecuadamente funciones?",
        [
          "Personas distintas cobran y revisan",
          "Quien cobra aprueba y revisa todo",
          "Eliminar comprobantes de diferencias",
        ],
      ],
      [
        "Evidencia de auditoría",
        "La evidencia sustenta conclusiones. Puede provenir de documentos, observación, confirmación y recálculo. Su utilidad depende de la pregunta revisada, su pertinencia y su confiabilidad.",
        "Una cuenta por cobrar registra Bs 4.000. Se revisan factura, entrega y confirmación del cliente. Un cobro posterior de Bs 1.500 deja Bs 2.500 pendientes; no demuestra por sí solo que el saldo restante sea recuperable.",
        "¿Cuánto queda pendiente?",
        ["Bs 2.500", "Bs 1.500", "Bs 5.500"],
      ],
      [
        "Riesgo de auditoría",
        "El riesgo incluye concluir inadecuadamente ante errores significativos. Evaluar operaciones y controles permite seleccionar procedimientos concretos. Revisar más documentos sin objetivo no garantiza mejores conclusiones.",
        "Un inventario suma Bs 60.000. Artículos por Bs 18.000 no tienen conteo reciente y representan 30 % del total. Se propone contar esos artículos, comparar registros e investigar diferencias. Documenta qué pregunta responde cada procedimiento.",
        "¿Qué proporción requiere revisión?",
        ["30 %", "18 %", "60 %"],
      ],
    ],
  },
];

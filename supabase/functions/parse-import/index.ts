import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Import SheetJS for Excel/CSV parsing
import * as XLSX from "npm:xlsx@0.18.5";

interface ParsedExercise {
  original_text: string;
  name: string;
  sets?: number | string;
  reps?: number | string;
  load?: string;
  rest_seconds?: number;
  notes?: string;
  superset_group?: string;
  order?: number;
  category?: string;
  equipment?: string;
}

interface ParsedWorkout {
  name: string;
  day_label?: string;
  exercises: ParsedExercise[];
}

interface ParsedWeek {
  week_number: number;
  name?: string;
  workouts: ParsedWorkout[];
}

interface ParsedImport {
  detected_format: string;
  confidence: number;
  plan_name?: string;
  weeks: ParsedWeek[];
}

// Detect header row from common terms
function detectHeaderRow(sheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const headerTerms = [
    "exercise",
    "sets",
    "reps",
    "name",
    "workout",
    "movement",
    "notes",
    "week",
    "day",
    "load",
    "rest",
    "weight",
    "tempo",
    "rpe",
  ];

  for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
    let matchCount = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "string") {
        const val = cell.v.toLowerCase().trim();
        if (headerTerms.some((term) => val.includes(term))) {
          matchCount++;
        }
      }
    }
    if (matchCount >= 2) return r;
  }
  return 0;
}

// Parse column mapping from headers
function mapColumns(
  headers: string[]
): Record<string, number> {
  const mapping: Record<string, number> = {};
  const patterns: Record<string, RegExp[]> = {
    exercise: [/exercise/i, /movement/i, /name/i, /lift/i],
    sets: [/^sets?$/i, /set count/i],
    reps: [/^reps?$/i, /repetitions?/i, /rep range/i],
    load: [/load/i, /weight/i, /%1rm/i, /rpe/i, /intensity/i],
    rest: [/rest/i, /recovery/i, /pause/i],
    notes: [/notes?/i, /comments?/i, /instructions?/i, /coaching/i],
    week: [/week/i],
    day: [/day/i, /workout/i, /session/i],
    superset: [/superset/i, /group/i, /circuit/i, /pair/i],
    order: [/order/i, /\#/i, /num/i],
    category: [/type/i, /category/i, /strength|cardio/i],
    equipment: [/equipment/i, /gear/i, /tool/i],
  };

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i] || "";
    for (const [key, regexes] of Object.entries(patterns)) {
      if (regexes.some((r) => r.test(header)) && !(key in mapping)) {
        mapping[key] = i;
      }
    }
  }

  return mapping;
}

// Parse Excel data into structured format
function parseExcelData(workbook: XLSX.WorkBook): ParsedImport {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const headerRow = detectHeaderRow(sheet);
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (data.length <= headerRow + 1) {
    return {
      detected_format: "single_workout",
      confidence: 0.3,
      weeks: [{ week_number: 1, workouts: [{ name: "Imported Workout", exercises: [] }] }],
    };
  }

  const headers = (data[headerRow] || []).map((h: any) => String(h || ""));
  const colMap = mapColumns(headers);
  const rows = data.slice(headerRow + 1).filter((row) =>
    row.some((cell: any) => cell !== "" && cell !== null && cell !== undefined)
  );

  // Detect format based on presence of week/day columns
  const hasWeekCol = "week" in colMap;
  const hasDayCol = "day" in colMap;

  let detectedFormat: string = "single_workout";
  let confidence = 0.7;

  // Check for "Type" column that explicitly states the format
  if ("category" in colMap) {
    const typeValues = rows
      .map((r) => String(r[colMap.category] || "").toLowerCase())
      .filter(Boolean);
    if (typeValues.some((v) => v.includes("plan"))) {
      detectedFormat = "coach_plan";
      confidence = 0.9;
    } else if (typeValues.some((v) => v.includes("split"))) {
      detectedFormat = "split";
      confidence = 0.9;
    }
  }

  if (detectedFormat === "single_workout") {
    if (hasWeekCol) {
      const uniqueWeeks = new Set(
        rows.map((r) => String(r[colMap.week] || "")).filter(Boolean)
      );
      if (uniqueWeeks.size > 1) {
        detectedFormat = "coach_plan";
        confidence = 0.85;
      }
    }

    if (detectedFormat === "single_workout" && hasDayCol) {
      const uniqueDays = new Set(
        rows.map((r) => String(r[colMap.day] || "")).filter(Boolean)
      );
      if (uniqueDays.size > 1) {
        detectedFormat = "split";
        confidence = 0.8;
      }
    }

    // Check for "Week X" patterns in data
    if (detectedFormat === "single_workout") {
      for (const row of rows) {
        for (const cell of row) {
          if (typeof cell === "string" && /week\s*\d+/i.test(cell)) {
            detectedFormat = "coach_plan";
            confidence = 0.7;
            break;
          }
        }
        if (detectedFormat !== "single_workout") break;
      }
    }
  }

  // Extract plan name from first row or sheet name
  let planName =
    sheetName !== "Sheet1" ? sheetName : undefined;

  // Check for plan name in specific column
  const planNameCol = headers.findIndex((h) =>
    /plan\s*name/i.test(h)
  );
  if (planNameCol >= 0 && rows[0]) {
    const val = String(rows[0][planNameCol] || "");
    if (val) planName = val;
  }

  // Group rows into weeks and workouts
  const weeksMap = new Map<number, Map<string, ParsedExercise[]>>();
  let exerciseOrder = 0;

  for (const row of rows) {
    const exerciseName =
      "exercise" in colMap
        ? String(row[colMap.exercise] || "").trim()
        : "";

    if (!exerciseName) {
      // Could be a workout name row or blank separator
      continue;
    }

    const weekNum = hasWeekCol
      ? parseInt(String(row[colMap.week] || "1").replace(/\D/g, "")) || 1
      : 1;
    const dayLabel = hasDayCol
      ? String(row[colMap.day] || "Workout").trim()
      : "Workout";

    const workoutName = dayLabel || "Workout";

    if (!weeksMap.has(weekNum)) {
      weeksMap.set(weekNum, new Map());
    }
    const weekWorkouts = weeksMap.get(weekNum)!;
    if (!weekWorkouts.has(workoutName)) {
      weekWorkouts.set(workoutName, []);
    }

    const setsVal = "sets" in colMap ? row[colMap.sets] : undefined;
    const repsVal = "reps" in colMap ? row[colMap.reps] : undefined;

    const exercise: ParsedExercise = {
      original_text: exerciseName,
      name: exerciseName,
      sets: setsVal !== "" && setsVal !== undefined ? setsVal : undefined,
      reps: repsVal !== "" && repsVal !== undefined ? repsVal : undefined,
      load: "load" in colMap ? String(row[colMap.load] || "") || undefined : undefined,
      rest_seconds:
        "rest" in colMap
          ? parseInt(String(row[colMap.rest] || "")) || undefined
          : undefined,
      notes:
        "notes" in colMap
          ? String(row[colMap.notes] || "") || undefined
          : undefined,
      superset_group:
        "superset" in colMap
          ? String(row[colMap.superset] || "") || undefined
          : undefined,
      order: exerciseOrder++,
      category:
        "category" in colMap
          ? String(row[colMap.category] || "").toLowerCase().includes("cardio")
            ? "cardio"
            : "strength"
          : undefined,
      equipment:
        "equipment" in colMap
          ? String(row[colMap.equipment] || "") || undefined
          : undefined,
    };

    weekWorkouts.get(workoutName)!.push(exercise);
  }

  // Convert to structured format
  const weeks: ParsedWeek[] = [];
  const sortedWeekNums = Array.from(weeksMap.keys()).sort((a, b) => a - b);

  for (const weekNum of sortedWeekNums) {
    const weekWorkouts = weeksMap.get(weekNum)!;
    const workouts: ParsedWorkout[] = [];

    for (const [workoutName, exercises] of weekWorkouts.entries()) {
      workouts.push({
        name: workoutName,
        day_label: workoutName,
        exercises,
      });
    }

    weeks.push({
      week_number: weekNum,
      name: `Week ${weekNum}`,
      workouts,
    });
  }

  // If no exercises found, return empty structure
  if (weeks.length === 0 || weeks.every((w) => w.workouts.every((wo) => wo.exercises.length === 0))) {
    // Try to parse without column mapping (just use first two columns as exercise + sets/reps)
    const fallbackExercises: ParsedExercise[] = [];
    for (const row of rows) {
      const firstCell = String(row[0] || "").trim();
      if (firstCell && !/^(week|day|workout|exercise|sets|reps|notes)/i.test(firstCell)) {
        fallbackExercises.push({
          original_text: firstCell,
          name: firstCell,
          sets: row[1] !== undefined ? row[1] : undefined,
          reps: row[2] !== undefined ? row[2] : undefined,
          notes: row[3] !== undefined ? String(row[3]) : undefined,
          order: fallbackExercises.length,
        });
      }
    }

    if (fallbackExercises.length > 0) {
      return {
        detected_format: "single_workout",
        confidence: 0.5,
        plan_name: planName,
        weeks: [
          {
            week_number: 1,
            workouts: [
              {
                name: planName || "Imported Workout",
                exercises: fallbackExercises,
              },
            ],
          },
        ],
      };
    }
  }

  return {
    detected_format: detectedFormat,
    confidence,
    plan_name: planName,
    weeks,
  };
}

// Parse PDF using AI gateway
async function parsePDFWithAI(
  textContent: string
): Promise<ParsedImport> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const prompt = `You are a fitness workout parser. Extract structured workout data from the following text content of a PDF document.

The content may contain:
- A single workout (list of exercises with sets/reps)
- A training split (multiple workouts grouped by day)
- A multi-week training plan (workouts organized by week)

Extract ALL exercises with their sets, reps, load guidance, rest periods, and notes.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "detected_format": "single_workout" | "split" | "coach_plan",
  "confidence": 0.0 to 1.0,
  "plan_name": "optional plan name",
  "weeks": [
    {
      "week_number": 1,
      "name": "Week 1",
      "workouts": [
        {
          "name": "Workout Name",
          "day_label": "Monday",
          "exercises": [
            {
              "original_text": "the exact text from the PDF",
              "name": "Exercise Name",
              "sets": 3,
              "reps": "8-12",
              "load": "RPE 7",
              "rest_seconds": 90,
              "notes": "any coaching notes",
              "superset_group": "A",
              "category": "strength",
              "equipment": "barbell"
            }
          ]
        }
      ]
    }
  ]
}

PDF Content:
${textContent.substring(0, 15000)}`;

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI Gateway error:", errText);
    throw new Error(`AI parsing failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "";

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr.trim());
    return parsed as ParsedImport;
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", jsonStr.substring(0, 500));
    throw new Error("Failed to parse AI response");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_content, file_type, file_name } = await req.json();

    if (!file_content || !file_type) {
      return new Response(
        JSON.stringify({ error: "file_content and file_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: ParsedImport;

    if (file_type === "pdf") {
      // For PDF, the client sends extracted text content
      parsed = await parsePDFWithAI(file_content);
    } else {
      // For Excel/CSV, decode base64 and parse with SheetJS
      const binaryStr = atob(file_content);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const workbook = XLSX.read(bytes, { type: "array" });
      parsed = parseExcelData(workbook);
    }

    // Set plan name from file if not detected
    if (!parsed.plan_name && file_name) {
      const nameWithoutExt = file_name.replace(/\.[^.]+$/, "");
      parsed.plan_name = nameWithoutExt;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse import error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown parsing error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

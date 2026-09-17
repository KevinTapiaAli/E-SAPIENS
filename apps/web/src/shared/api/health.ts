export type HealthResponse = {
  status: string;
  service: string;
  dependencies: {
    database: {
      status: string;
      name?: string;
    };
    redis: {
      status: string;
    };
  };
  timestamp: string;
};

export async function getSystemHealth(): Promise<HealthResponse | null> {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/api/v1/health/ready`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

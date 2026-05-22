import { Job, UnrecoverableError } from 'bullmq';

export async function processDocumentJob(job: Job) {
  console.log(`[Job ${job.id}] Processing document for tenant ${job.data.tenantId}`);
  
  await job.updateProgress(10);
  
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${aiServiceUrl}/documents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: job.data.tenantId,
        knowledgeBaseId: job.data.knowledgeBaseId,
        filePath: job.data.filePath,
      })
    });
    
    await job.updateProgress(50);
    
    if (!response.ok) {
      const text = await response.text();
      if (response.status === 400 || response.status === 404) {
        // These are likely unrecoverable errors (e.g., file not found or invalid format)
        throw new UnrecoverableError(`FastAPI returned unrecoverable error ${response.status}: ${text}`);
      }
      throw new Error(`FastAPI returned ${response.status}: ${text}`);
    }
    
    const data = await response.json();
    if (data.status === 'error') {
       throw new UnrecoverableError(`Processing failed: ${data.message}`);
    }
    
    await job.updateProgress(100);
    console.log(`[Job ${job.id}] Finished processing document ${job.data.filePath}`);
    
    return { status: 'success' };
  } catch (error: any) {
    console.error(`[Job ${job.id}] Error processing document: ${error.message}`);
    throw error;
  }
}

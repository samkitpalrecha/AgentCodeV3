let pyodideInstance = null;

export async function loadPyodideInstance() {
  if (!pyodideInstance) {
    pyodideInstance = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
    });
  }
  return pyodideInstance;
}

export async function runPython(code) {
  const pyodide = await loadPyodideInstance();

  let stdout = '';
  let stderr = '';

  const appendStdout = (s) => {
    stdout += s;
    if (!s.endsWith('\n')) stdout += '\n';
  };
  const appendStderr = (s) => {
    stderr += s;
    if (!s.endsWith('\n')) stderr += '\n';
  };

  pyodide.setStdout({ batched: appendStdout });
  pyodide.setStderr({ batched: appendStderr });

  try {
    await pyodide.runPythonAsync(code);
    return stdout.trim() || '(no output)';
  } catch (err) {
    return `Error:\n${stderr.trim() || err}`;
  }
}
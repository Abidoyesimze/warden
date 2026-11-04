use near_sdk::env;

/// Escapes a string for safe embedding inside a JSON string literal.
/// Needed for owner/agent-supplied free text (vendor ids, reject reasons);
/// everything else logged is either a NEAR account id or a decimal number,
/// both already JSON-safe by construction.
pub fn esc(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

/// JSON array of strings, each escaped and quoted.
pub fn str_array(items: &[String]) -> String {
    let parts: Vec<String> = items.iter().map(|s| format!("\"{}\"", esc(s))).collect();
    format!("[{}]", parts.join(","))
}

/// Emits a NEP-297 log. Every state change in the contract goes through
/// this so the audit trail (scripts/audit.ts) can rebuild history from
/// chain alone, without trusting the backend.
///
/// `data` is a pre-built JSON object literal, e.g. from
/// `format!(r#"{{"id":{id}}}"#)` — hand-built rather than via serde_json's
/// `json!` macro, which pulls in its dynamic `Value` tree machinery and
/// meaningfully bloats the compiled contract for no on-chain benefit; the
/// typed method return values (Payment, Vendor, Config) still go through
/// near-sdk's normal typed JSON serialization, which is unaffected by this.
pub fn emit(event: &str, data: &str) {
    env::log_str(&format!(
        r#"EVENT_JSON:{{"standard":"warden","version":"1.0.0","event":"{event}","data":[{data}]}}"#
    ));
}

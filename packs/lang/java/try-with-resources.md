---
id: java/try-with-resources
title: Close what you open with try-with-resources
applies: ["**/*.java"]
severity: must-fix
stage: diff
status: draft
source: dev.java, "Catching and Handling Exceptions", "The Try-with-resources Statement", https://dev.java/learn/language/annotations-exceptions/exceptions/catching-handling/; JDK 25 API, java.nio.file.Files (lines, list, walk and find must be closed)
quote: "A resource is an object that must be closed after the program is finished with it. The try-with-resources statement ensures that each resource is closed at the end of the statement."
added: 2026-10-19
---

Open anything that holds a file, a socket or a connection in a
try-with-resources block, so it closes on every path, including exceptions and
early returns. That includes the streams from `Files.lines`, `Files.list`,
`Files.walk` and `Files.find`. Most streams need no closing, but these hold
open files, and the JDK docs say they must be closed.

**Why:** A `close()` at the end of a block is skipped as soon as something
throws or returns early. Leaked file handles and connections pile up until the
process hits its limit and starts failing everywhere.

**Flag:** a stream, reader, writer, channel, JDBC connection, store iterator
or client that is created without try-with-resources and not returned or
stored; `Files.lines(...)`, `Files.list(...)` or `Files.walk(...)` chained
straight into a pipeline; `close()` called at the end of a block with no
`finally`.

**Don't flag:** objects whose `close()` does nothing, like
`ByteArrayInputStream`, `ByteArrayOutputStream`, `StringWriter` and streams
over collections; a resource the method returns or stores in a field, so its
caller or owner closes it; `System.out` and `System.err`; resources a framework
opens and closes for you.

**Bad:**

```java
List<String> errorLines(Path log) throws IOException {
    return Files.lines(log)
        .filter(line -> line.contains("ERROR"))
        .toList();
}
```

**Good:**

```java
List<String> errorLines(Path log) throws IOException {
    try (Stream<String> lines = Files.lines(log)) {
        return lines.filter(line -> line.contains("ERROR")).toList();
    }
}
```

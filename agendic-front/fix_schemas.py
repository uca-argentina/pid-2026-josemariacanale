import re
with open('tests/unit/app/_components/business-schemas.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r"describe\('employeeSchema'.*?\}\);\n", re.DOTALL)
replacement = '''describe('employeeSchema', () => {
    const employee = { email: 'martina@estudio.com' };

    it('acepta un email sin espacios', () => {
        expect(employeeSchema.parse({ email: ' martina@estudio.com ' })).toEqual(employee);
    });

    it('rechaza un email invalido', () => {
        const result = employeeSchema.safeParse({ ...employee, email: 'martina' });
        expect(result.success).toBe(false);
    });
});
'''
new_content = pattern.sub(replacement, content)
with open('tests/unit/app/_components/business-schemas.test.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)
